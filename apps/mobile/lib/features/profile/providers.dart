import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/providers.dart';
import '../../core/models/menu.dart';
import '../../core/models/order.dart';

final profileProvider = FutureProvider<UserProfile>((ref) async {
  final api = ref.read(apiClientProvider);
  final resp = await api.get('/profile');
  return UserProfile.fromJson(resp.data);
});

final addressesProvider = FutureProvider<List<UserAddress>>((ref) async {
  final api = ref.read(apiClientProvider);
  final resp = await api.get('/addresses');
  return (resp.data['addresses'] as List?)?.map((e) => UserAddress.fromJson(e)).toList() ?? [];
});
