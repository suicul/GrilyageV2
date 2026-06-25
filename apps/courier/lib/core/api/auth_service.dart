import 'client.dart';

class AuthService {
  final ApiClient _client;

  AuthService(this._client);

  Future<Map<String, String>> login({
    required String login,
    required String password,
  }) async {
    final response = await _client.post('/staff/auth/login', data: {
      'login': login,
      'password': password,
    });

    final accessToken = response.data['accessToken'] as String? ?? response.data['access_token'] as String;
    final refreshToken = response.data['refreshToken'] as String? ?? '';
    return {'accessToken': accessToken, 'refreshToken': refreshToken};
  }
}
