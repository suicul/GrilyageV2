import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/theme.dart';
import 'providers.dart';

class OrdersScreen extends ConsumerWidget {
  const OrdersScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final orders = ref.watch(ordersProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Мои заказы')),
      body: RefreshIndicator(
        onRefresh: () async { ref.invalidate(ordersProvider); },
        child: orders.when(
          loading: () => const Center(child: CircularProgressIndicator()),
          error: (e, _) => ListView(
            children: [
              SizedBox(height: MediaQuery.of(context).size.height * 0.3),
              const Center(
                child: Column(
                  children: [
                    Icon(Icons.cloud_off, size: 48, color: GrilyageTheme.textMuted),
                    SizedBox(height: 16),
                    Text('Ошибка загрузки заказов'),
                  ],
                ),
              ),
            ],
          ),
          data: (items) {
            if (items.isEmpty) {
              return ListView(
                children: [
                  SizedBox(height: MediaQuery.of(context).size.height * 0.3),
                  Center(
                    child: Column(
                      children: [
                        Icon(Icons.receipt_long, size: 64, color: GrilyageTheme.textMuted),
                        const SizedBox(height: 16),
                        Text('Нет заказов', style: Theme.of(context).textTheme.titleMedium),
                      ],
                    ),
                  ),
                ],
              );
            }
            return ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              itemBuilder: (context, i) {
                final order = items[i];
                return Card(
                  margin: const EdgeInsets.only(bottom: 12),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text('Заказ #${order.id.split('-').first}',
                              style: Theme.of(context).textTheme.titleSmall),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(
                                color: Color(int.parse(order.statusColor.replaceFirst('#', '0xFF'))).withValues(alpha: 0.2),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Text(order.statusLabel,
                                style: TextStyle(color: Color(int.parse(order.statusColor.replaceFirst('#', '0xFF')))),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(order.totalFormatted, style: const TextStyle(
                          color: GrilyageTheme.gold, fontWeight: FontWeight.bold, fontSize: 16,
                        )),
                        Text(order.createdAt.substring(0, 10), style: const TextStyle(color: GrilyageTheme.textMuted)),
                        if (order.status == 'DELIVERING') ...[
                          const SizedBox(height: 8),
                          SizedBox(
                            width: double.infinity,
                            child: OutlinedButton.icon(
                              onPressed: () => context.push('/tracking/${order.id}'),
                              icon: const Icon(Icons.navigation, size: 18),
                              label: const Text('Отследить'),
                              style: OutlinedButton.styleFrom(
                                foregroundColor: GrilyageTheme.gold,
                                side: const BorderSide(color: GrilyageTheme.gold),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}
