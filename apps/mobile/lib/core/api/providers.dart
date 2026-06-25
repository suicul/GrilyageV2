import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'client.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

final apiClientProvider = Provider<ApiClient>((ref) {
  final client = ApiClient(
    storage: const FlutterSecureStorage(),
    connectivity: Connectivity(),
  );
  client.init();
  return client;
});

final connectivityProvider = StreamProvider<bool>((ref) {
  return Connectivity().onConnectivityChanged.map(
    (r) => r.any((c) => c != ConnectivityResult.none),
  );
});
