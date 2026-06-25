import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/models/menu.dart';
import '../../core/storage/hive_service.dart';

class CartItem {
  final MobileProduct product;
  int quantity;

  CartItem({required this.product, required this.quantity});

  int get total => product.price * quantity;

  Map<String, dynamic> toJson() => {
    'product': {
      'id': product.id,
      'name': product.name,
      'slug': product.slug,
      'description': product.description,
      'price': product.price,
      'weightGrams': product.weightGrams,
      'kcal': product.kcal,
      'protein': product.protein,
      'fat': product.fat,
      'carbs': product.carbs,
      'imageUrl': product.imageUrl,
      'isNew': product.isNew,
      'categoryId': product.categoryId,
      'categoryName': product.categoryName,
      'categorySlug': product.categorySlug,
      'subcategoryName': product.subcategoryName,
      'subcategorySlug': product.subcategorySlug,
    },
    'quantity': quantity,
  };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
    product: MobileProduct.fromJson(json['product'] as Map<String, dynamic>),
    quantity: json['quantity'] as int,
  );
}

class CartState {
  final Map<String, CartItem> items;

  const CartState({this.items = const {}});

  List<CartItem> get itemList => items.values.toList();
  int get total => itemList.fold(0, (s, i) => s + i.total);
  int get count => itemList.fold(0, (s, i) => s + i.quantity);
  bool get isEmpty => items.isEmpty;
  String get totalFormatted => '${(total / 100).toStringAsFixed(2)} ₽';
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  final hive = ref.watch(hiveServiceProvider);
  return CartNotifier(hive);
});

class CartNotifier extends StateNotifier<CartState> {
  final HiveService _hive;

  CartNotifier(this._hive) : super(const CartState()) {
    _loadFromHive();
  }

  void _loadFromHive() {
    final data = _hive.loadCart;
    if (data == null || data.isEmpty) return;
    final items = <String, CartItem>{};
    for (final entry in data.entries) {
      items[entry.key] = CartItem.fromJson(
        Map<String, dynamic>.from(entry.value),
      );
    }
    state = CartState(items: items);
  }

  void _persist() {
    final data = <String, Map<String, dynamic>>{};
    for (final entry in state.items.entries) {
      data[entry.key] = entry.value.toJson();
    }
    _hive.saveCart(data);
  }

  void add(MobileProduct product, {int quantity = 1}) {
    final items = Map<String, CartItem>.from(state.items);
    if (items.containsKey(product.slug)) {
      items[product.slug]!.quantity += quantity;
    } else {
      items[product.slug] = CartItem(product: product, quantity: quantity);
    }
    state = CartState(items: items);
    _persist();
  }

  void remove(String slug) {
    final items = Map<String, CartItem>.from(state.items);
    items.remove(slug);
    state = CartState(items: items);
    _persist();
  }

  void updateQuantity(String slug, int quantity) {
    if (quantity <= 0) {
      remove(slug);
      return;
    }
    final items = Map<String, CartItem>.from(state.items);
    if (items.containsKey(slug)) {
      items[slug]!.quantity = quantity;
    }
    state = CartState(items: items);
    _persist();
  }

  void clear() {
    state = const CartState();
    _hive.saveCart({});
  }
}
