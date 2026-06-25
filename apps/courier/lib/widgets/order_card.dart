import 'package:flutter/material.dart';
import '../core/models/order.dart';

class OrderCard extends StatelessWidget {
  const OrderCard({
    super.key,
    required this.order,
    required this.onTap,
  });

  final Order order;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final statusColor = _statusColor(order.status);
    final statusLabel = _statusLabel(order.status);

    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 8,
                      vertical: 4,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.15),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Text(
                      statusLabel,
                      style: TextStyle(
                        color: statusColor,
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                  const Spacer(),
                  Text(
                    '#${order.id.substring(0, 8)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurfaceVariant,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                order.customerName,
                style: theme.textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w600,
                ),
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.phone, size: 14),
                  const SizedBox(width: 6),
                  Text(order.customerPhone),
                ],
              ),
              const SizedBox(height: 4),
              Row(
                children: [
                  const Icon(Icons.location_on, size: 14),
                  const SizedBox(width: 6),
                  Expanded(
                    child: Text(
                      '${order.address.street}, ${order.address.building}',
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Text(
                    '${order.items.length} поз. · ${order.total.toStringAsFixed(0)} ₽',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case Order.statusNew:
        return Colors.blue;
      case Order.statusAccepted:
        return Colors.orange;
      case Order.statusPreparing:
        return Colors.amber;
      case Order.statusReady:
        return Colors.green;
      case Order.statusPickedUp:
        return Colors.purple;
      case Order.statusDelivered:
        return Colors.grey;
      case Order.statusCancelled:
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  String _statusLabel(String status) {
    switch (status) {
      case Order.statusNew:
        return 'Новый';
      case Order.statusAccepted:
        return 'Подтверждён';
      case Order.statusPreparing:
        return 'Готовится';
      case Order.statusReady:
        return 'Готов к выдаче';
      case Order.statusPickedUp:
        return 'В пути';
      case Order.statusDelivered:
        return 'Доставлен';
      case Order.statusCancelled:
        return 'Отменён';
      default:
        return status;
    }
  }
}
