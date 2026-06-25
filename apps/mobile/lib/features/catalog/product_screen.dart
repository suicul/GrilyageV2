import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/theme.dart';
import '../../widgets/grilyage_button.dart';
import '../catalog/providers.dart';
import '../cart/providers.dart';

class ProductScreen extends ConsumerWidget {
  final String slug;

  const ProductScreen({super.key, required this.slug});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final product = ref.watch(productBySlugProvider(slug));
    if (product == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Товар не найден')),
        body: const Center(child: Text('Товар не найден')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: Text(product.name)),
      body: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (product.imageUrl != null)
              CachedNetworkImage(
                imageUrl: product.imageUrl!,
                width: double.infinity,
                height: 280,
                fit: BoxFit.cover,
                placeholder: (_, __) => Container(
                  height: 280, color: GrilyageTheme.border,
                  child: const Center(child: CircularProgressIndicator()),
                ),
              ),
            Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(product.name, style: Theme.of(context).textTheme.headlineSmall),
                  const SizedBox(height: 8),
                  Text(product.description, style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: GrilyageTheme.textWood,
                  )),
                  const SizedBox(height: 16),
                  Row(
                    children: [
                      Text(product.priceFormatted, style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: GrilyageTheme.gold, fontWeight: FontWeight.bold,
                      )),
                      const Spacer(),
                      Text('${product.weightGrams} г', style: Theme.of(context).textTheme.bodyMedium),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                    children: [
                      _Nutrient(label: 'Ккал', value: '${product.kcal}'),
                      _Nutrient(label: 'Белки', value: '${product.protein} г'),
                      _Nutrient(label: 'Жиры', value: '${product.fat} г'),
                      _Nutrient(label: 'Углеводы', value: '${product.carbs} г'),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
      bottomNavigationBar: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: GrilyageButton(
            text: 'В корзину — ${product.priceFormatted}',
            onPressed: () {
              ref.read(cartProvider.notifier).add(product);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Добавлено в корзину')),
              );
            },
          ),
        ),
      ),
    );
  }
}

class _Nutrient extends StatelessWidget {
  final String label;
  final String value;
  const _Nutrient({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text(value, style: Theme.of(context).textTheme.titleSmall?.copyWith(
          color: GrilyageTheme.gold, fontWeight: FontWeight.bold,
        )),
        Text(label, style: Theme.of(context).textTheme.bodySmall?.copyWith(
          color: GrilyageTheme.textWood,
        )),
      ],
    );
  }
}
