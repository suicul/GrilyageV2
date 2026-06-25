import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/theme.dart';
import '../../widgets/grilyage_button.dart';
import 'providers.dart';

class CartScreen extends ConsumerWidget {
  const CartScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final cart = ref.watch(cartProvider);

    if (cart.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_cart_outlined, size: 64, color: GrilyageTheme.textMuted),
            const SizedBox(height: 16),
            Text('Корзина пуста', style: Theme.of(context).textTheme.titleMedium),
          ],
        ),
      );
    }

    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: cart.itemList.length,
            separatorBuilder: (_, __) => const Divider(height: 1),
            itemBuilder: (context, i) {
              final item = cart.itemList[i];
              return Container(
                padding: const EdgeInsets.symmetric(vertical: 8),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(item.product.name.isNotEmpty ? item.product.name : 'Товар',
                            maxLines: 2, overflow: TextOverflow.ellipsis,
                            style: Theme.of(context).textTheme.bodyLarge),
                          const SizedBox(height: 4),
                          Text(item.product.priceFormatted,
                            style: const TextStyle(color: GrilyageTheme.gold, fontWeight: FontWeight.w600)),
                        ],
                      ),
                    ),
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        IconButton(
                          icon: const Icon(Icons.remove_circle_outline),
                          onPressed: () => ref.read(cartProvider.notifier).updateQuantity(
                            item.product.slug, item.quantity - 1,
                          ),
                        ),
                        Text('${item.quantity}',
                          style: Theme.of(context).textTheme.titleMedium),
                        IconButton(
                          icon: const Icon(Icons.add_circle_outline),
                          onPressed: () => ref.read(cartProvider.notifier).updateQuantity(
                            item.product.slug, item.quantity + 1,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            },
          ),
        ),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
          ),
          child: SafeArea(
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text('Итого:', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                    Text(cart.totalFormatted, style: const TextStyle(
                      fontSize: 20, fontWeight: FontWeight.bold, color: GrilyageTheme.gold,
                    )),
                  ],
                ),
                const SizedBox(height: 12),
                GrilyageButton(
                  text: 'Оформить заказ (${cart.count} шт)',
                  onPressed: () => context.push('/checkout'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
