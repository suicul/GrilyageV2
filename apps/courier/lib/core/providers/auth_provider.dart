import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../api/auth_service.dart';
import '../api/client.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient();
  return client;
});

final authServiceProvider = Provider<AuthService>((ref) {
  return AuthService(ref.watch(apiClientProvider));
});

enum AuthStatus { unknown, authenticated, unauthenticated }

class AuthNotifier extends Notifier<AuthStatus> {
  String? _token;

  String? get token => _token;

  @override
  AuthStatus build() => AuthStatus.unknown;

  Future<void> tryAutoLogin() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('staff_token');
    if (saved != null) {
      _token = saved;
      ref.read(apiClientProvider).setToken(saved);
      state = AuthStatus.authenticated;
    } else {
      state = AuthStatus.unauthenticated;
    }
  }

  Future<void> login({
    required String login,
    required String password,
  }) async {
    final authService = ref.read(authServiceProvider);
    final tokens = await authService.login(login: login, password: password);
    _token = tokens['accessToken'];
    ref.read(apiClientProvider).setToken(_token);
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('staff_token', _token!);
    if (tokens['refreshToken']!.isNotEmpty) {
      await prefs.setString('staff_refresh_token', tokens['refreshToken']!);
    }
    state = AuthStatus.authenticated;
  }

  Future<void> logout() async {
    _token = null;
    ref.read(apiClientProvider).setToken(null);
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('staff_token');
    state = AuthStatus.unauthenticated;
  }
}

final authProvider = NotifierProvider<AuthNotifier, AuthStatus>(AuthNotifier.new);
