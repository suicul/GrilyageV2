import 'dart:async';
import 'package:location/location.dart' as loc;
import '../api/client.dart';

/// Handles GPS tracking and periodic location updates to the backend.
class CourierLocationService {
  final ApiClient _api;
  loc.Location? _location;
  StreamSubscription<loc.LocationData>? _subscription;
  bool _running = false;
  Timer? _forceSendTimer;

  CourierLocationService(this._api);

  bool get isRunning => _running;

  /// Start periodic GPS tracking. Sends location every 5 seconds.
  Future<void> start() async {
    if (_running) return;

    _location = loc.Location();

    // Check and request permissions
    bool serviceEnabled = await _location!.serviceEnabled();
    if (!serviceEnabled) {
      serviceEnabled = await _location!.requestService();
      if (!serviceEnabled) return;
    }

    PermissionStatus permissionGranted = await _location!.hasPermission();
    if (permissionGranted == PermissionStatus.denied) {
      permissionGranted = await _location!.requestPermission();
      if (permissionGranted != PermissionStatus.granted) return;
    }

    _running = true;

    // Listen to location changes
    _subscription = _location!.onLocationChanged.listen(
      (locData) => _sendLocation(locData),
    );

    // Force-send every 10s as fallback
    _forceSendTimer = Timer.periodic(
      const Duration(seconds: 10),
      (_) => _sendLastKnown(),
    );

    // Get initial location
    final initial = await _location!.getLocation();
    _sendLocation(initial);
  }

  /// Stop GPS tracking.
  Future<void> stop() async {
    _running = false;
    await _subscription?.cancel();
    _subscription = null;
    _forceSendTimer?.cancel();
    _forceSendTimer = null;
    _location = null;
  }

  loc.LocationData? _lastData;

  void _sendLocation(loc.LocationData data) {
    _lastData = data;
    if (data.latitude == null || data.longitude == null) return;
    _api.patch('/staff/location', data: {
      'latitude': data.latitude,
      'longitude': data.longitude,
    }).catchError((_) {});
  }

  void _sendLastKnown() {
    if (_lastData != null) _sendLocation(_lastData!);
  }
}

// PermissionStatus re-export for convenience
typedef PermissionStatus = loc.PermissionStatus;
