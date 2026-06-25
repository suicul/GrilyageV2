import 'package:hive_flutter/hive_flutter.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'dart:convert';

final hiveServiceProvider = Provider<HiveService>((ref) {
  throw UnimplementedError('HiveService must be initialized in main()');
});

class HiveService {
  static const String _menuBox = 'menu_cache';
  static const String _cartBox = 'cart';

  static Future<HiveService> init() async {
    await Hive.initFlutter();
    await Hive.openBox(_menuBox);
    await Hive.openBox(_cartBox);
    return HiveService();
  }

  Box get _cart => Hive.box(_cartBox);
  Box get _menu => Hive.box(_menuBox);

  Future<void> cacheMenu(Map<String, dynamic> data) =>
      _menu.put('menu', jsonEncode(data));

  Map<String, dynamic>? get cachedMenu {
    final raw = _menu.get('menu') as String?;
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  Future<void> saveCart(Map<String, dynamic> data) =>
      _cart.put('cart', jsonEncode(data));

  Map<String, dynamic>? get loadCart {
    final raw = _cart.get('cart') as String?;
    if (raw == null) return null;
    return jsonDecode(raw) as Map<String, dynamic>;
  }

  int get cartCount {
    final raw = _cart.get('cart') as String?;
    if (raw == null) return 0;
    final data = jsonDecode(raw) as Map<String, dynamic>;
    return data.length;
  }
}
