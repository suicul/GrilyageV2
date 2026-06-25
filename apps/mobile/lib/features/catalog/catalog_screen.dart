import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:shimmer/shimmer.dart';
import 'package:cached_network_image/cached_network_image.dart';
import '../../core/theme/theme.dart';
import '../../core/models/menu.dart';
import '../../widgets/grilyage_card.dart';
import 'providers.dart';

class CatalogScreen extends ConsumerWidget {
  const CatalogScreen({super.key, this.selectedCategory});

  final String? selectedCategory;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final menu = ref.watch(menuProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Меню')),
      body: RefreshIndicator(
        onRefresh: () async { ref.invalidate(menuProvider); },
        child: menu.when(
          loading: () => _buildShimmer(),
          error: (e, _) => ListView(
            children: [
              SizedBox(height: MediaQuery.of(context).size.height * 0.3),
              const Center(
                child: Column(
                  children: [
                    Icon(Icons.cloud_off, size: 48, color: GrilyageTheme.textMuted),
                    SizedBox(height: 16),
                    Text('Ошибка загрузки'),
                  ],
                ),
              ),
            ],
          ),
          data: (data) => _CategoriesView(categories: data.categories),
        ),
      ),
    );
  }

  Widget _buildShimmer() => Shimmer.fromColors(
    baseColor: Colors.grey.shade200,
    highlightColor: Colors.grey.shade100,
    child: ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: 6,
      itemBuilder: (_, __) => Container(
        margin: const EdgeInsets.only(bottom: 16),
        height: 120,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
        ),
      ),
    ),
  );
}

class _CategoriesView extends StatelessWidget {
  final List<Category> categories;

  const _CategoriesView({required this.categories});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 12),
          child: Text('Категории', style: Theme.of(context).textTheme.titleLarge),
        ),
        Expanded(
          child: GridView.builder(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 2,
              childAspectRatio: 1.4,
              crossAxisSpacing: 12,
              mainAxisSpacing: 12,
            ),
            itemCount: categories.length,
            itemBuilder: (context, i) {
              final cat = categories[i];
              return GrilyageCard(
                onTap: () => context.push('/category/${cat.slug}', extra: cat),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    if (cat.imageUrl != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(12),
                        child: CachedNetworkImage(
                          imageUrl: cat.imageUrl!,
                          height: 60, width: 60,
                          fit: BoxFit.cover,
                          placeholder: (_, __) => Container(color: GrilyageTheme.border),
                        ),
                      ),
                    const SizedBox(height: 8),
                    Text(cat.name, style: Theme.of(context).textTheme.titleSmall,
                      textAlign: TextAlign.center, maxLines: 2, overflow: TextOverflow.ellipsis),
                  ],
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}
