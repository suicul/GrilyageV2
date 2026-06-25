import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

/// WebSocket connection to /orders namespace for real-time order tracking.
class UserOrdersSocket {
  io.Socket? _socket;
  final _courierLocationController = StreamController<CourierLocation>.broadcast();

  Stream<CourierLocation> get courierLocationStream => _courierLocationController.stream;

  /// Connect to the /orders namespace using the stored JWT.
  Future<void> connect() async {
    if (_socket?.connected == true) return;

    const storage = FlutterSecureStorage();
    final token = await storage.read(key: 'access_token');
    if (token == null) return;

    _socket = io.io(
      'https://grillyage.ru',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setAuth({'token': token})
          .enableForceNew()
          .build(),
    );

    _socket!.on('courier.location', (data) {
      if (data is Map<String, dynamic>) {
        _courierLocationController.add(CourierLocation(
          orderId: data['orderId'] as String? ?? '',
          latitude: (data['latitude'] as num).toDouble(),
          longitude: (data['longitude'] as num).toDouble(),
        ));
      }
    });

    _socket!.connect();
  }

  /// Subscribe to location updates for a specific order (join room).
  void subscribeToOrder(String orderId) {
    if (_socket?.connected == true) {
      _socket!.emit('subscribe', {'orderId': orderId});
    }
  }

  /// Unsubscribe from an order (leave room).
  void unsubscribeFromOrder(String orderId) {
    if (_socket?.connected == true) {
      _socket!.emit('unsubscribe', {'orderId': orderId});
    }
  }

  /// Fetch courier info via REST (initial state before WebSocket fires).
  Future<CourierInfo?> fetchCourierInfo(String orderId) async {
    try {
      const storage = FlutterSecureStorage();
      final token = await storage.read(key: 'access_token');
      if (token == null) return null;

      final client = HttpClient();
      client.connectionTimeout = const Duration(seconds: 10);
      final uri = Uri.parse('https://grillyage.ru/api/v1/mobile/orders/$orderId/courier');
      final request = await client.getUrl(uri);
      request.headers.set('Authorization', 'Bearer $token');
      request.headers.set('Content-Type', 'application/json');
      final response = await request.close();
      final body = await response.transform(utf8.decoder).join();

      if (response.statusCode == 200) {
        final json = jsonDecode(body) as Map<String, dynamic>;
        if (json['assigned'] == true && json['courier'] != null) {
          final c = json['courier'] as Map<String, dynamic>;
          return CourierInfo(
            name: c['name'] as String? ?? '',
            transportType: c['transportType'] as String? ?? '',
            latitude: (c['latitude'] as num?)?.toDouble(),
            longitude: (c['longitude'] as num?)?.toDouble(),
            lastLocationAt: c['lastLocationAt'] as String?,
          );
        }
      }
      client.close();
    } catch (_) {
      // Silent — tracking shows "no courier"
    }
    return null;
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.clearListeners();
    _socket = null;
  }

  void dispose() {
    disconnect();
    _courierLocationController.close();
  }
}

class CourierLocation {
  final String orderId;
  final double latitude;
  final double longitude;

  const CourierLocation({
    required this.orderId,
    required this.latitude,
    required this.longitude,
  });
}

class CourierInfo {
  final String name;
  final String transportType;
  final double? latitude;
  final double? longitude;
  final String? lastLocationAt;

  const CourierInfo({
    required this.name,
    required this.transportType,
    this.latitude,
    this.longitude,
    this.lastLocationAt,
  });

  String get transportLabel {
    switch (transportType) {
      case 'CAR': return 'Автомобиль';
      case 'BIKE': return 'Велосипед';
      case 'WALKING': return 'Пешком';
      default: return transportType;
    }
  }
}

/// Provider that manages the WebSocket connection lifecycle.
final userOrdersSocketProvider = Provider<UserOrdersSocket>((ref) {
  final socket = UserOrdersSocket();
  ref.onDispose(() => socket.dispose());
  return socket;
});

/// Provider that exposes the courier location stream for a specific order.
final courierLocationProvider = StreamProvider.family<CourierLocation?, String>((ref, orderId) {
  final socket = ref.watch(userOrdersSocketProvider);
  socket.connect();
  socket.subscribeToOrder(orderId);

  ref.onDispose(() {
    socket.unsubscribeFromOrder(orderId);
  });

  return socket.courierLocationStream.map((loc) => loc);
});
