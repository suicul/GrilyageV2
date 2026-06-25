import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/api/providers.dart';
import '../../core/models/menu.dart';
import '../../core/storage/hive_service.dart';

final menuProvider = FutureProvider<MenuResponse>((ref) async {
  final api = ref.read(apiClientProvider);
  final hive = ref.read(hiveServiceProvider);
  try {
    final resp = await api.get('/menu');
    final menu = MenuResponse.fromJson(resp.data);
    hive.cacheMenu(resp.data);
    return menu;
  } catch (e) {
    final cached = hive.cachedMenu;
    if (cached != null) return MenuResponse.fromJson(cached);
    rethrow;
  }
});

final categoryProvider = Provider.family<List<MobileProduct>, String>((ref, categorySlug) {
  final menu = ref.watch(menuProvider).valueOrNull;
  if (menu == null) return [];
  return menu.products.where((p) => p.categorySlug == categorySlug).toList();
});

final productBySlugProvider = Provider.family<MobileProduct?, String>((ref, slug) {
  final menu = ref.watch(menuProvider).valueOrNull;
  if (menu == null) return null;
  try {
    return menu.products.firstWhere((p) => p.slug == slug);
  } catch (_) {
    return null;
  }
});
