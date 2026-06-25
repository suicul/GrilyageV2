import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/theme.dart';
import '../../core/api/providers.dart';
import '../../core/services/connectivity_service.dart';
import '../../features/auth/providers.dart';
import '../../widgets/grilyage_button.dart';
import 'providers.dart';

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key});

  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen> {
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController(text: '+7');
  final _emailController = TextEditingController();
  final _addressController = TextEditingController();
  final _commentController = TextEditingController();
  String _deliveryMode = 'pickup';
  String _paymentMethod = 'cash';
  bool _loading = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final user = ref.read(authStateProvider).user;
      if (user != null) {
        if (user.name.isNotEmpty) _nameController.text = user.name;
        if (user.phone != null) _phoneController.text = user.phone!;
      }
    });
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _addressController.dispose();
    _commentController.dispose();
    super.dispose();
  }

  Future<void> _submitOrder() async {
    final authState = ref.read(authStateProvider);
    if (!authState.isAuthenticated) {
      context.push('/login');
      return;
    }

    final isOnline = ref.read(connectivityServiceProvider).isOnline;
    if (!isOnline) {
      setState(() => _error = 'Нет подключения к интернету. Для оформления заказа требуется интернет.');
      return;
    }

    final name = _nameController.text.trim();
    final phone = _phoneController.text.trim();
    if (name.isEmpty || phone.length < 10) {
      setState(() => _error = 'Заполните имя и телефон');
      return;
    }

    setState(() { _loading = true; _error = null; });
    try {
      final cart = ref.read(cartProvider);
      final api = ref.read(apiClientProvider);
      final resp = await api.post('/orders', data: {
        'items': cart.itemList.map((i) => ({
          'productId': i.product.id,
          'qty': i.quantity,
        })).toList(),
        'deliveryMode': _deliveryMode,
        'paymentMethod': _paymentMethod,
        'customerName': name,
        'customerPhone': phone,
        'customerEmail': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
        'address': _deliveryMode == 'delivery' ? _addressController.text.trim() : null,
        'comment': _commentController.text.trim().isEmpty ? null : _commentController.text.trim(),
      });
      ref.read(cartProvider.notifier).clear();
      if (!mounted) return;
      context.push('/order-success', extra: resp.data);
    } catch (e) {
      setState(() => _error = 'Ошибка оформления заказа. Попробуйте снова.');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Оформление заказа')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Контактные данные', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            TextField(
              controller: _nameController,
              decoration: const InputDecoration(labelText: 'Имя *'),
              textCapitalization: TextCapitalization.words,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              decoration: const InputDecoration(labelText: 'Телефон *'),
              keyboardType: TextInputType.phone,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _emailController,
              decoration: const InputDecoration(labelText: 'Email (необязательно)'),
              keyboardType: TextInputType.emailAddress,
            ),
            const SizedBox(height: 24),
            Text('Способ получения', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'pickup', label: Text('Самовывоз')),
                ButtonSegment(value: 'delivery', label: Text('Доставка')),
              ],
              selected: {_deliveryMode},
              onSelectionChanged: (v) => setState(() => _deliveryMode = v.first),
            ),
            if (_deliveryMode == 'delivery') ...[
              const SizedBox(height: 12),
              TextField(
                controller: _addressController,
                decoration: const InputDecoration(labelText: 'Адрес доставки'),
                maxLines: 2,
              ),
            ],
            const SizedBox(height: 24),
            Text('Оплата', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 12),
            SegmentedButton<String>(
              segments: const [
                ButtonSegment(value: 'cash', label: Text('Наличные')),
                ButtonSegment(value: 'card', label: Text('Картой курьеру')),
                ButtonSegment(value: 'online', label: Text('Онлайн')),
              ],
              selected: {_paymentMethod},
              onSelectionChanged: (v) => setState(() => _paymentMethod = v.first),
            ),
            const SizedBox(height: 24),
            TextField(
              controller: _commentController,
              decoration: const InputDecoration(labelText: 'Комментарий'),
              maxLines: 3,
            ),
            const SizedBox(height: 24),
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text('${cart.count} товаров', style: Theme.of(context).textTheme.titleSmall),
                    Text(cart.totalFormatted, style: const TextStyle(
                      color: GrilyageTheme.gold, fontWeight: FontWeight.bold, fontSize: 20,
                    )),
                  ],
                ),
              ),
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(_error!, style: const TextStyle(color: GrilyageTheme.error)),
            ],
            const SizedBox(height: 16),
            GrilyageButton(
              text: 'Подтвердить заказ',
              isLoading: _loading,
              onPressed: _submitOrder,
            ),
            const SizedBox(height: 32),
          ],
        ),
      ),
    );
  }
}

class OrderSuccessScreen extends StatelessWidget {
  final Map<String, dynamic> order;

  const OrderSuccessScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Заказ оформлен')),
      body: Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.check_circle, size: 80, color: GrilyageTheme.success),
              const SizedBox(height: 24),
              Text('Спасибо за заказ!', style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text('Номер заказа: #${order['number'] ?? order['id']}',
                style: Theme.of(context).textTheme.titleMedium?.copyWith(color: GrilyageTheme.gold)),
              const SizedBox(height: 8),
              Text('Мы свяжемся с вами для подтверждения',
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: GrilyageTheme.textWood),
                textAlign: TextAlign.center),
              const SizedBox(height: 32),
              ElevatedButton(
                onPressed: () => context.go('/orders'),
                child: const Text('Мои заказы'),
              ),
              const SizedBox(height: 12),
              OutlinedButton(
                onPressed: () => context.go('/'),
                child: const Text('В меню'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
