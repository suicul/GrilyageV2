import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:hive_flutter/hive_flutter.dart';

class ApiClient {
  static const String _baseUrl = 'https://grillyage.ru/api/v1/mobile';
  static const String _storageKey = 'access_token';
  static const String _refreshKey = 'refresh_token';
  static const String _cacheBox = 'api_cache';

  final Dio _dio;
  final FlutterSecureStorage _storage;
  final Connectivity _connectivity;

  ApiClient({
    String? baseUrl,
    Dio? dio,
    FlutterSecureStorage? storage,
    Connectivity? connectivity,
  })  : _dio = dio ?? Dio(BaseOptions(
    baseUrl: baseUrl ?? _baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
    headers: {'Content-Type': 'application/json'},
  )),
        _storage = storage ?? const FlutterSecureStorage(),
        _connectivity = connectivity ?? Connectivity();

  Future<void> init() async {
    await Hive.openBox(_cacheBox);
    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) async {
        // Attach auth token
        final token = await _storage.read(key: _storageKey);
        if (token != null) {
          options.headers['Authorization'] = 'Bearer $token';
        }

        // Offline cache hit for GET requests
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
        if (response.requestOptions.method == 'GET' &&
            response.statusCode == 200) {
          _setCache(response.requestOptions.path, response.data);
        }
        handler.next(response);
      },
      onError: (error, handler) async {
        // Token refresh on 401
        if (error.response?.statusCode == 401) {
          final refreshed = await _tryRefresh();
          if (refreshed) {
            final retry = _dio.fetch(error.requestOptions);
            handler.resolve(await retry);
            return;
          }
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
      final refresh = await _storage.read(key: _refreshKey);
      if (refresh == null) return false;
      final resp = await Dio(BaseOptions(baseUrl: _dio.options.baseUrl))
          .post('/auth/refresh', data: {'refreshToken': refresh});
      final token = resp.data['accessToken'] as String;
      final newRefresh = resp.data['refreshToken'] as String;
      await _storage.write(key: _storageKey, value: token);
      await _storage.write(key: _refreshKey, value: newRefresh);
      return true;
    } catch (_) {
      await _storage.deleteAll();
      return false;
    }
  }

  Future<Response<T>> get<T>(String path, {Map<String, dynamic>? query}) =>
      _dio.get<T>(path, queryParameters: query);

  Future<Response<T>> post<T>(String path, {dynamic data}) =>
      _dio.post<T>(path, data: data);

  Future<Response<T>> patch<T>(String path, {dynamic data}) =>
      _dio.patch<T>(path, data: data);

  Future<Response<T>> delete<T>(String path) =>
      _dio.delete<T>(path);

  Future<void> setTokens(String access, String refresh) async {
    await _storage.write(key: _storageKey, value: access);
    await _storage.write(key: _refreshKey, value: refresh);
  }

  Future<void> clearTokens() async {
    await _storage.deleteAll();
  }

  Future<bool> get isOnline async {
    final result = await _connectivity.checkConnectivity();
    return result.any((r) => r != ConnectivityResult.none);
  }

  // ─── Offline Cache ───

  dynamic _cacheGet(String path) {
    final box = Hive.box(_cacheBox);
    final raw = box.get(path) as String?;
    if (raw == null) return null;
    return jsonDecode(raw);
  }

  void _setCache(String path, dynamic data) {
    final box = Hive.box(_cacheBox);
    box.put(path, jsonEncode(data));
  }

  Future<void> clearCache() async {
    await Hive.box(_cacheBox).clear();
  }
}
