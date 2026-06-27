import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../api/api_client.dart';
import '../models/menu.dart';

/// Auth state for mobile app (carries user profile).
class MobileAuthState {
  final bool isLoading;
  final bool isAuthenticated;
  final UserProfile? user;
  final String? error;

  const MobileAuthState({
    this.isLoading = false,
    this.isAuthenticated = false,
    this.user,
    this.error,
  });

  MobileAuthState copyWith({
    bool? isLoading,
    bool? isAuthenticated,
    UserProfile? user,
    String? error,
  }) =>
      MobileAuthState(
        isLoading: isLoading ?? this.isLoading,
        isAuthenticated: isAuthenticated ?? this.isAuthenticated,
        user: user ?? this.user,
        error: error,
      );
}

/// Provider for the shared ApiClient instance.
/// Must be overridden in app main().
final apiClientProvider = Provider<ApiClient>((ref) {
  throw UnimplementedError('apiClientProvider must be overridden in app main()');
});

