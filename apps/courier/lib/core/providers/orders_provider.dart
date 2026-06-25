import 'dart:convert';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import '../models/order.dart';
import '../services/location_service.dart';
import 'auth_provider.dart';

final ordersProvider =
    NotifierProvider<OrdersNotifier, AsyncValue<List<Order>>>(OrdersNotifier.new);

class OrdersNotifier extends Notifier<AsyncValue<List<Order>>> {
  io.Socket? _socket;
  CourierLocationService? _locationService;

  @override
  AsyncValue<List<Order>> build() => const AsyncValue.loading();

  void connect(String token) {
    _socket = io.io(
      'http://10.0.2.2:4000/staff',
      io.OptionBuilder()
          .setTransports(['websocket'])
          .setExtraHeaders({'Authorization': 'Bearer $token'})
          .disableAutoConnect()
          .build(),
    );

    _socket!.onConnect((_) => _fetchOrders());
    _socket!.on('order.created', (data) => _handleOrderEvent('new', data));
    _socket!.on('order.updated', (data) => _handleOrderEvent('updated', data));
    _socket!.onDisconnect((_) {
      Future.delayed(const Duration(seconds: 5), () => connect(token));
    });
    _socket!.onError((_) {
      Future.delayed(const Duration(seconds: 5), () => connect(token));
    });
    _socket!.connect();
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    stopTracking();
  }

  Future<void> _fetchOrders() async {
    try {
      final client = ref.read(apiClientProvider);
      final response = await client.get('/staff/orders/courier');
      final list = (response.data as List)
          .map((json) => Order.fromJson(json as Map<String, dynamic>))
          .toList();
      state = AsyncValue.data(list);
    } on Exception catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  void _handleOrderEvent(String type, dynamic data) {
    final orderJson = data is Map<String, dynamic> ? data : null;
    if (orderJson == null) return;

    final updated = Order.fromJson(orderJson);

    state.whenData((orders) {
      if (type == 'new' || type == 'updated') {
        final idx = orders.indexWhere((o) => o.id == updated.id);
        final newList = [...orders];
        if (idx >= 0) {
          newList[idx] = updated;
        } else {
          newList.insert(0, updated);
        }
        state = AsyncValue.data(newList);
      } else if (type == 'removed') {
        state = AsyncValue.data(orders.where((o) => o.id != updated.id).toList());
      }
    });
  }

  Future<void> updateStatus(String orderId, String status) async {
    try {
      final client = ref.read(apiClientProvider);
      await client.patch('/staff/orders/$orderId/status', data: {'status': status});
      _fetchOrders();
    } on Exception catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Start GPS tracking for courier location
  Future<void> startTracking() async {
    final client = ref.read(apiClientProvider);
    _locationService ??= CourierLocationService(client);
    await _locationService!.start();
  }

  /// Stop GPS tracking
  Future<void> stopTracking() async {
    await _locationService?.stop();
    _locationService = null;
  }

  /// Check if tracking is active
  bool get isTracking => _locationService?.isRunning ?? false;
}
