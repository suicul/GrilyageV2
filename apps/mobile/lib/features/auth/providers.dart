import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/providers.dart';
import '../../core/api/client.dart';
import '../../core/models/menu.dart';

final authStateProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.read(apiClientProvider));
});

class AuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserProfile? user;
  final String? error;

  const AuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.error,
  });

  AuthState copyWith({bool? isLoading, bool? isAuthenticated, UserProfile? user, String? error}) =>
      AuthState(
        isLoading: isLoading ?? this.isLoading,
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        user: user ?? this.user,
        error: error,
      );
}

class AuthNotifier extends StateNotifier<AuthState> {
  final ApiClient _api;

  AuthNotifier(this._api) : super(const AuthState());

  Future<void> login(String codeId, String? name) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final resp = await _api.post('/auth/login', data: {
        'codeId': codeId,
        if (name != null) 'name': name,
      });
      final auth = AuthResponse.fromJson(resp.data);
      await _api.setTokens(auth.accessToken, auth.refreshToken);
      await fetchProfile();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Ошибка входа');
    }
  }

  Future<void> register(String codeId, String name) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final resp = await _api.post('/auth/register', data: {
        'codeId': codeId,
        'name': name,
      });
      final auth = AuthResponse.fromJson(resp.data);
      await _api.setTokens(auth.accessToken, auth.refreshToken);
      await fetchProfile();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Ошибка регистрации');
    }
  }

  Future<void> phoneOtpLogin(String phone, String code) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final resp = await _api.post('/auth/social/phone-otp', data: {
        'phone': phone,
        'code': code,
      });
      await _api.setTokens(resp.data['accessToken'], resp.data['refreshToken']);
      await fetchProfile();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Ошибка входа по телефону');
    }
  }

  Future<void> completeAuth(String codeId, String? name) async {
    state = state.copyWith(isLoading: true, error: null);
    try {
      final resp = await _api.post('/auth/complete', data: {
        'codeId': codeId,
        if (name != null) 'name': name,
      });
      final auth = AuthResponse.fromJson(resp.data);
      await _api.setTokens(auth.accessToken, auth.refreshToken);
      await fetchProfile();
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Ошибка авторизации');
    }
  }

  Future<void> fetchProfile() async {
    try {
      final resp = await _api.get('/profile');
      final user = UserProfile.fromJson(resp.data);
      state = AuthState(isAuthenticated: true, user: user);
    } catch (_) {
      state = AuthState(isAuthenticated: true);
    }
  }

  Future<void> logout() async {
    await _api.clearTokens();
    state = const AuthState();
  }
}
