import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/theme.dart';
import '../catalog/providers.dart';

class PromotionsScreen extends ConsumerWidget {
  const PromotionsScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menu = ref.watch(menuProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Акции и скидки')),
      body: menu.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Ошибка загрузки')),
        data: (data) {
          if (data.promotions.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.local_offer_outlined, size: 64, color: GrilyageTheme.textWood),
                  const SizedBox(height: 16),
                  Text('Нет активных акций', style: Theme.of(context).textTheme.titleMedium),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: data.promotions.length,
            itemBuilder: (_, i) {
              final promo = data.promotions[i];
              return _PromoCard(
                title: promo.title,
                description: promo.description,
                discount: promo.discountPercent,
              );
            },
          );
        },
      ),
    );
  }
}

class _PromoCard extends StatelessWidget {
  final String title;
  final String? description;
  final int? discount;

  const _PromoCard({required this.title, this.description, this.discount});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Container(
              width: 64, height: 64,
              decoration: BoxDecoration(
                color: GrilyageTheme.gold.withValues(alpha: 0.15),
                borderRadius: BorderRadius.circular(16),
              ),
              child: discount != null
                  ? Center(
                      child: Text('-$discount%', style: const TextStyle(
                        color: GrilyageTheme.gold, fontWeight: FontWeight.bold, fontSize: 18)),
                    )
                  : Icon(Icons.local_offer, color: GrilyageTheme.gold, size: 28),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: const TextStyle(
                    fontWeight: FontWeight.w600, fontSize: 15)),
                  if (description != null && description!.isNotEmpty) ...[
                    const SizedBox(height: 4),
                    Text(description!, style: const TextStyle(
                      color: GrilyageTheme.textWood, fontSize: 13)),
                  ],
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: GrilyageTheme.textWood),
          ],
        ),
      ),
    );
  }
}
