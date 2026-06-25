import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/providers.dart';
import '../../core/models/order.dart';

final ordersProvider = FutureProvider<List<Order>>((ref) async {
  final api = ref.read(apiClientProvider);
  final resp = await api.get('/orders');
  return (resp.data['orders'] as List?)?.map((e) => Order.fromJson(e)).toList() ?? [];
});

final orderByIdProvider = FutureProvider.family<Order?, String>((ref, id) async {
  final api = ref.read(apiClientProvider);
  final resp = await api.get('/orders/$id');
  return Order.fromJson(resp.data);
});
