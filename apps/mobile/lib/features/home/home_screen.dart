import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/theme.dart';
import '../catalog/providers.dart';

class HomeScreen extends ConsumerWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menu = ref.watch(menuProvider);

    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.restaurant, color: GrilyageTheme.gold, size: 20),
            const SizedBox(width: 8),
            const Text('Грильяж'),
          ],
        ),
      ),
      body: RefreshIndicator(
        onRefresh: () => ref.refresh(menuProvider.future),
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _PromoBanner(),
              const SizedBox(height: 24),
              Text('Меню', style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 12),
              menu.when(
                loading: () => const _CategorySkeleton(),
                error: (_, __) => const SizedBox(),
                data: (data) => SizedBox(
                  height: 110,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: data.categories.length,
                    separatorBuilder: (_, __) => const SizedBox(width: 12),
                    itemBuilder: (_, i) {
                      final cat = data.categories[i];
                      return _CategoryChip(
                        name: cat.name,
                        imageUrl: cat.imageUrl,
                        onTap: () => context.push('/category/${cat.slug}'),
                      );
                    },
                  ),
                ),
              ),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text('Популярное', style: Theme.of(context).textTheme.titleLarge),
                  TextButton(
                    onPressed: () => context.go('/menu'),
                    child: const Text('Всё меню'),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              menu.when(
                loading: () => const _PopularSkeleton(),
                error: (_, __) => const SizedBox(),
                data: (data) {
                  final popular = data.products.take(4).toList();
                  return Column(
                    children: popular.map((p) => _PopularItem(
                      name: p.name,
                      price: p.priceFormatted,
                      weight: '${p.weightGrams}г',
                      imageUrl: p.imageUrl,
                      onTap: () => context.push('/product/${p.slug}'),
                    )).toList(),
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _PromoBanner extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Container(
      height: 160,
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [GrilyageTheme.gold, GrilyageTheme.goldLight],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
      ),
      child: Stack(
        children: [
          Positioned(
            right: -20,
            top: -20,
            child: Icon(Icons.restaurant_menu, size: 120,
              color: Colors.white.withValues(alpha: 0.15)),
          ),
          Padding(
            padding: const EdgeInsets.all(24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text('Доставка', style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  color: GrilyageTheme.textDark, fontWeight: FontWeight.bold)),
                const SizedBox(height: 4),
                Text('Грильяж — вкус, который\nобъединяет', style: TextStyle(
                  color: GrilyageTheme.textDark.withValues(alpha: 0.8), fontSize: 14)),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => context.go('/menu'),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: GrilyageTheme.textDark,
                    foregroundColor: Colors.white,
                    minimumSize: const Size(140, 40),
                  ),
                  child: const Text('Заказать'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String name;
  final String? imageUrl;
  final VoidCallback onTap;

  const _CategoryChip({required this.name, this.imageUrl, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        width: 80,
        decoration: BoxDecoration(
          color: GrilyageTheme.surfaceCard,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: GrilyageTheme.border),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: SizedBox(
                width: 40, height: 40,
                child: imageUrl != null && imageUrl!.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: imageUrl!,
                        fit: BoxFit.cover,
                        placeholder: (_, __) => Container(color: GrilyageTheme.border),
                        errorWidget: (_, __, ___) => Icon(Icons.restaurant,
                          color: GrilyageTheme.gold, size: 20),
                      )
                    : Icon(Icons.restaurant, color: GrilyageTheme.gold, size: 20),
              ),
            ),
            const SizedBox(height: 6),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4),
              child: Text(name, textAlign: TextAlign.center,
                maxLines: 2, overflow: TextOverflow.ellipsis,
                style: const TextStyle(fontSize: 11)),
            ),
          ],
        ),
      ),
    );
  }
}

class _PopularItem extends StatelessWidget {
  final String name, price, weight;
  final String? imageUrl;
  final VoidCallback onTap;

  const _PopularItem({required this.name, required this.price, required this.weight, this.imageUrl, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        onTap: onTap,
        leading: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: SizedBox(
            width: 48, height: 48,
            child: imageUrl != null && imageUrl!.isNotEmpty
                ? CachedNetworkImage(
                    imageUrl: imageUrl!,
                    fit: BoxFit.cover,
                    placeholder: (_, __) => Container(color: GrilyageTheme.border),
                    errorWidget: (_, __, ___) => Icon(Icons.restaurant,
                      color: GrilyageTheme.gold, size: 24),
                  )
                : Container(
                    color: GrilyageTheme.gold.withValues(alpha: 0.15),
                    child: Icon(Icons.restaurant, color: GrilyageTheme.gold, size: 24),
                  ),
          ),
        ),
        title: Text(name, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(weight, style: const TextStyle(color: GrilyageTheme.textWood, fontSize: 12)),
        trailing: Text(price, style: const TextStyle(
          color: GrilyageTheme.gold, fontWeight: FontWeight.bold, fontSize: 16)),
      ),
    );
  }
}

class _CategorySkeleton extends StatelessWidget {
  const _CategorySkeleton();
  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 100,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: 4,
        separatorBuilder: (_, __) => const SizedBox(width: 12),
        itemBuilder: (_, __) => Container(
          width: 80,
          decoration: BoxDecoration(
            color: GrilyageTheme.border,
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
  }
}

class _PopularSkeleton extends StatelessWidget {
  const _PopularSkeleton();
  @override
  Widget build(BuildContext context) {
    return Column(
      children: List.generate(3, (_) => Container(
        margin: const EdgeInsets.only(bottom: 8),
        height: 64,
        decoration: BoxDecoration(
          color: GrilyageTheme.border,
          borderRadius: BorderRadius.circular(16),
        ),
      )),
    );
  }
}
