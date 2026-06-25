import 'dart:async';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Reactive connectivity state.
final connectivityStateProvider = StreamProvider<bool>((ref) {
  final service = ref.watch(connectivityServiceProvider);
  return service.statusStream;
});

final connectivityServiceProvider = Provider<ConnectivityService>((ref) {
  return ConnectivityService();
});

class ConnectivityService {
  final Connectivity _connectivity;
  bool _cachedOnline = true;
  late final StreamController<bool> _controller;

  ConnectivityService({Connectivity? connectivity})
    : _connectivity = connectivity ?? Connectivity() {
    _controller = StreamController<bool>.broadcast();
    _connectivity.onConnectivityChanged.listen((result) {
      _cachedOnline = result.any((r) => r != ConnectivityResult.none);
      _controller.add(_cachedOnline);
    });
  }

  bool get isOnline => _cachedOnline;

  Stream<bool> get statusStream => _controller.stream;

  Future<bool> checkNow() async {
    final result = await _connectivity.checkConnectivity();
    _cachedOnline = result.any((r) => r != ConnectivityResult.none);
    return _cachedOnline;
  }

  void dispose() {
    _controller.close();
  }
}
