import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../core/models/order.dart';
import '../core/providers/orders_provider.dart';
import 'courier_map_screen.dart';

class OrderDetailScreen extends ConsumerWidget {
  const OrderDetailScreen({super.key, required this.orderId});

  final String orderId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final ordersAsync = ref.watch(ordersProvider);
    final order = ordersAsync.whenOrNull(
      data: (orders) => orders.where((o) => o.id == orderId).firstOrNull,
    );

    if (order == null) {
      return Scaffold(
        appBar: AppBar(title: const Text('Заказ')),
        body: const Center(child: Text('Заказ не найден')),
      );
    }

    final theme = Theme.of(context);
    final statusColor = _statusColor(order.status);

    return Scaffold(
      appBar: AppBar(title: Text('Заказ #${order.id.substring(0, 8)}')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Status section
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: statusColor.withValues(alpha: 0.1),
              borderRadius: BorderRadius.circular(12),
            ),
            child: Row(
              children: [
                Icon(_statusIcon(order.status), color: statusColor, size: 32),
                const SizedBox(width: 12),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _statusLabel(order.status),
                      style: theme.textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: statusColor,
                      ),
                    ),
                    if (order.createdAt != null)
                      Text(
                        'Создан: ${_formatDate(order.createdAt!)}',
                        style: theme.textTheme.bodySmall,
                      ),
                  ],
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          // Customer section
          _SectionCard(
            title: 'Клиент',
            children: [
              _InfoRow(icon: Icons.person, text: order.customerName),
              _InfoRow(icon: Icons.phone, text: order.customerPhone),
              if (order.comment != null && order.comment!.isNotEmpty)
                _InfoRow(icon: Icons.comment, text: order.comment!),
            ],
          ),
          const SizedBox(height: 12),

          // Address section
          _SectionCard(
            title: 'Адрес доставки',
            children: [
              _InfoRow(
                icon: Icons.location_on,
                text: '${order.address.street}, ${order.address.building}',
              ),
              if (order.address.apartment != null)
                _InfoRow(icon: Icons.door_front_door, text: 'Кв. ${order.address.apartment}'),
              if (order.address.entrance != null)
                _InfoRow(icon: Icons.stairs, text: 'Подъезд ${order.address.entrance}'),
              if (order.address.floor != null)
                _InfoRow(icon: Icons.layers, text: 'Этаж ${order.address.floor}'),
              if (order.address.intercom != null)
                _InfoRow(icon: Icons.keyboard, text: 'Домофон ${order.address.intercom}'),
            ],
          ),
          const SizedBox(height: 12),

          // Items section
          _SectionCard(
            title: 'Состав заказа',
            children: [
              for (final item in order.items)
                Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Expanded(
                        child: Text('${item.name} ×${item.quantity}'),
                      ),
                      Text('${(item.price * item.quantity).toStringAsFixed(0)} ₽'),
                    ],
                  ),
                ),
              const Divider(),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text('Итого', style: TextStyle(fontWeight: FontWeight.bold)),
                  Text(
                    '${order.total.toStringAsFixed(0)} ₽',
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 16,
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 24),

          // Action buttons
          _buildActions(context, ref, order),
        ],
      ),
    );
  }

  Widget _buildActions(BuildContext context, WidgetRef ref, Order order) {
    final actions = <Widget>[];

    // Courier-specific status flow: only see orders ready for pickup → delivering → completed
    switch (order.status) {
      case Order.statusReady:
        actions.add(_ActionButton(
          label: 'Забрать заказ',
          icon: Icons.delivery_dining,
          color: Colors.purple,
          onPressed: () async {
            await _updateStatus(ref, order.id, Order.statusPickedUp);
            // Start GPS tracking when courier picks up the order
            await ref.read(ordersProvider.notifier).startTracking();
          },
        ));
      case Order.statusPickedUp:
        actions.add(_ActionButton(
          label: 'Маршрут',
          icon: Icons.map,
          color: Colors.blue,
          onPressed: () => _openMap(context, order.id),
        ));
        actions.add(_ActionButton(
          label: 'Доставлен',
          icon: Icons.celebration,
          color: Colors.green,
          onPressed: () async {
            // Stop GPS tracking after delivery
            await ref.read(ordersProvider.notifier).stopTracking();
            await _updateStatus(ref, order.id, Order.statusDelivered);
          },
        ));
    }

    return Column(children: actions);
  }

  void _openMap(BuildContext context, String orderId) {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (_) => CourierMapScreen(orderId: orderId),
      ),
    );
  }

  Future<void> _updateStatus(WidgetRef ref, String orderId, String status) async {
    await ref.read(ordersProvider.notifier).updateStatus(orderId, status);
  }

  Color _statusColor(String status) {
    switch (status) {
      case Order.statusNew: return Colors.blue;
      case Order.statusAccepted: return Colors.orange;
      case Order.statusPreparing: return Colors.amber;
      case Order.statusReady: return Colors.green;
      case Order.statusPickedUp: return Colors.purple;
      case Order.statusDelivered: return Colors.grey;
      case Order.statusCancelled: return Colors.red;
      default: return Colors.grey;
    }
  }

  IconData _statusIcon(String status) {
    switch (status) {
      case Order.statusNew: return Icons.fiber_new;
      case Order.statusAccepted: return Icons.check_circle_outline;
      case Order.statusPreparing: return Icons.restaurant;
      case Order.statusReady: return Icons.check_circle;
      case Order.statusPickedUp: return Icons.delivery_dining;
      case Order.statusDelivered: return Icons.celebration;
      case Order.statusCancelled: return Icons.cancel;
      default: return Icons.help_outline;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case Order.statusNew: return 'Новый';
      case Order.statusAccepted: return 'Подтверждён';
      case Order.statusPreparing: return 'Готовится';
      case Order.statusReady: return 'Готов';
      case Order.statusPickedUp: return 'В пути';
      case Order.statusDelivered: return 'Доставлен';
      case Order.statusCancelled: return 'Отменён';
      default: return status;
    }
  }

  String _formatDate(DateTime dt) {
    return '${dt.day.toString().padLeft(2, '0')}.${dt.month.toString().padLeft(2, '0')} ${dt.hour.toString().padLeft(2, '0')}:${dt.minute.toString().padLeft(2, '0')}';
  }
}

class _SectionCard extends StatelessWidget {
  const _SectionCard({required this.title, required this.children});

  final String title;
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                    fontWeight: FontWeight.bold,
                    color: Theme.of(context).colorScheme.primary,
                  ),
            ),
            const SizedBox(height: 8),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  const _InfoRow({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        children: [
          Icon(icon, size: 16, color: Theme.of(context).colorScheme.onSurfaceVariant),
          const SizedBox(width: 8),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

class _ActionButton extends StatelessWidget {
  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: SizedBox(
        width: double.infinity,
        height: 48,
        child: FilledButton.icon(
          onPressed: onPressed,
          icon: Icon(icon),
          label: Text(label),
          style: FilledButton.styleFrom(backgroundColor: color),
        ),
      ),
    );
  }
}
