import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hive_flutter/hive_flutter.dart';
import '../constants/constants.dart' as config;

/// Shared HTTP client for both mobile and courier apps.
///
/// Features:
/// - Bearer token injection from secure storage
/// - Automatic token refresh on 401
/// - Offline cache fallback for GET requests
/// - Connectivity-aware request handling
class ApiClient {
  final Dio _dio;
  final FlutterSecureStorage _storage;
  final Connectivity _connectivity;

  ApiClient({
    String? baseUrl,
    Dio? dio,
    FlutterSecureStorage? storage,
    Connectivity? connectivity,
    String? cacheBoxName,
  })  : _dio = dio ??
            Dio(BaseOptions(
              baseUrl: baseUrl ?? config.ApiConfig.mobileBaseUrl,
              connectTimeout: const Duration(seconds: 10),
              receiveTimeout: const Duration(seconds: 15),
              headers: {'Content-Type': 'application/json'},
            )),
        _storage = storage ?? const FlutterSecureStorage(),
        _connectivity = connectivity ?? Connectivity();

  /// Current auth token (nullable, settable for courier-style auth)
  String? _authToken;

  /// Callback invoked when 401 occurs (for courier-style auth)
  void Function()? onUnauthorized;

  /// Initialize the client: open cache box and set up interceptors.
  Future<void> init() async {
    await Hive.openBox(config.StorageBoxes.apiCache);
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Attach auth token
        final token = _authToken ?? await _storage.read(key: config.ApiConfig.accessTokenKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }

        // Offline cache hit for GET requests (mobile-style)
        if (options.method == 'GET') {
          final result = await _connectivity.checkConnectivity();
          final isOnline = result.any((r) => r != ConnectivityResult.none);
          if (!isOnline && !options.path.contains('/auth/')) {
            final cache = _cacheGet(options.path);
            if (cache != null) {
              handler.resolve(Response(
                requestOptions: options,
                data: cache,
                statusCode: 200,
              ));
              return;
            }
          }
        }
        handler.next(options);
      },
      onResponse: (response, handler) async {
        // Cache GET responses
        if (response.requestOptions.method == 'GET' && response.statusCode == 200) {
          _cacheSet(response.requestOptions.path, response.data);
        }
        handler.next(response);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401) {
          // Try token refresh (mobile-style)
          final refreshed = await _tryRefresh();
          if (refreshed) {
            final retry = _dio.fetch(error.requestOptions);
            handler.resolve(await retry);
            return;
          }
          // Fallback to unauthorized callback (courier-style)
          onUnauthorized?.call();
        }

        // Network error — try cache fallback
        if (error.type == DioExceptionType.connectionTimeout ||
            error.type == DioExceptionType.connectionError) {
          final cache = _cacheGet(error.requestOptions.path);
          if (cache != null) {
            handler.resolve(Response(
              requestOptions: error.requestOptions,
              data: cache,
              statusCode: 200,
            ));
            return;
          }
        }
        handler.next(error);
      },
    ));
  }

  Future<bool> _tryRefresh() async {
    try {
      final refresh = await _storage.read(key: config.ApiConfig.refreshTokenKey);
      if (refresh == null) return false;
      final resp = await Dio(BaseOptions(baseUrl: _dio.options.baseUrl))
          .post('/auth/refresh', data: {'refreshToken': refresh});
      final token = resp.data['accessToken'] as String;
      final newRefresh = resp.data['refreshToken'] as String;
      await _storage.write(key: config.ApiConfig.accessTokenKey, value: token);
      await _storage.write(key: config.ApiConfig.refreshTokenKey, value: newRefresh);
      return true;
    } catch (_) {
      await _storage.deleteAll();
      return false;
    }
  }

  // ─── Public API ───

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) =>
      _dio.get<T>(path, queryParameters: query);

  Future<Response<T>> post<T>(String path, {dynamic data}) =>
      _dio.post<T>(path, data: data);

  Future<Response<T>> patch<T>(String path, {dynamic data}) =>
      _dio.patch<T>(path, data: data);

  Future<Response<T>> put<T>(String path, {dynamic data}) =>
      _dio.put<T>(path, data: data);

  Future<Response<T>> delete<T>(String path) => _dio.delete<T>(path);

  /// Set auth token directly (used by courier app).
  void setToken(String? token) => _authToken = token;

  /// Save tokens to secure storage (used by mobile app).
  Future<void> setTokens(String access, String refresh) async {
    await _storage.write(key: config.ApiConfig.accessTokenKey, value: access);
    await _storage.write(key: config.ApiConfig.refreshTokenKey, value: refresh);
  }

  /// Clear all tokens from secure storage.
  Future<void> clearTokens() async {
    await _storage.deleteAll();
    _authToken = null;
  }

  /// Check current connectivity.
  Future<bool> get isOnline async {
    final result = await _connectivity.checkConnectivity();
    return result.any((r) => r != ConnectivityResult.none);
  }

  // ─── Offline Cache ───

  dynamic _cacheGet(String path) {
    final box = Hive.box(config.StorageBoxes.apiCache);
    final raw = box.get(path) as String?;
    if (raw == null) return null;
    return jsonDecode(raw);
  }

  void _cacheSet(String path, dynamic data) {
    final box = Hive.box(config.StorageBoxes.apiCache);
    box.put(path, jsonEncode(data));
  }

  Future<void> clearCache() async {
    await Hive.box(config.StorageBoxes.apiCache).clear();
  }
}
