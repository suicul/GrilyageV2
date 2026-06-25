import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../core/theme/theme.dart';
import '../../core/models/order.dart';
import '../../core/api/providers.dart';
import 'providers.dart';

class AddressesScreen extends ConsumerStatefulWidget {
  const AddressesScreen({super.key});

  @override
  ConsumerState<AddressesScreen> createState() => _AddressesScreenState();
}

class _AddressesScreenState extends ConsumerState<AddressesScreen> {
  final _formKey = GlobalKey<FormState>();
  final _labelCtrl = TextEditingController();
  final _streetCtrl = TextEditingController();
  final _apartmentCtrl = TextEditingController();

  @override
  void dispose() {
    _labelCtrl.dispose();
    _streetCtrl.dispose();
    _apartmentCtrl.dispose();
    super.dispose();
  }

  Future<void> _addAddress() async {
    if (!_formKey.currentState!.validate()) return;
    final api = ref.read(apiClientProvider);
    try {
      await api.post('/addresses', data: {
        'label': _labelCtrl.text,
        'street': _streetCtrl.text,
        'apartment': _apartmentCtrl.text.isEmpty ? null : _apartmentCtrl.text,
      });
      if (mounted) Navigator.of(context).pop();
      _labelCtrl.clear();
      _streetCtrl.clear();
      _apartmentCtrl.clear();
      ref.invalidate(addressesProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ошибка при добавлении адреса')),
        );
      }
    }
  }

  Future<void> _deleteAddress(Address addr) async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: GrilyageTheme.surfaceCard,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Удалить адрес'),
        content: Text('Удалить "${addr.label} — ${addr.street}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Отмена'),
          ),
          TextButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: TextButton.styleFrom(foregroundColor: GrilyageTheme.error),
            child: const Text('Удалить'),
          ),
        ],
      ),
    );
    if (confirm != true) return;
    final api = ref.read(apiClientProvider);
    try {
      await api.delete('/addresses/${addr.id}');
      ref.invalidate(addressesProvider);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Ошибка при удалении адреса')),
        );
      }
    }
  }

  void _showAddSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: GrilyageTheme.surfaceCard,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        final bottom = MediaQuery.of(ctx).viewInsets.bottom;
        return Padding(
          padding: EdgeInsets.fromLTRB(24, 24, 24, 24 + bottom),
          child: Form(
            key: _formKey,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('Новый адрес',
                  style: Theme.of(ctx).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold)),
                const SizedBox(height: 20),
                TextFormField(
                  controller: _labelCtrl,
                  decoration: const InputDecoration(labelText: 'Метка'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Введите метку' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _streetCtrl,
                  decoration: const InputDecoration(labelText: 'Улица, дом'),
                  validator: (v) => v == null || v.trim().isEmpty ? 'Введите адрес' : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _apartmentCtrl,
                  decoration: const InputDecoration(labelText: 'Квартира/офис (необязательно)'),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _addAddress,
                  child: const Text('Добавить'),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final addresses = ref.watch(addressesProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('Мои адреса')),
      body: addresses.when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.cloud_off, size: 48, color: GrilyageTheme.textMuted),
              const SizedBox(height: 16),
              const Text('Ошибка загрузки адресов'),
              ElevatedButton(
                onPressed: () => ref.invalidate(addressesProvider),
                child: const Text('Повторить'),
              ),
            ],
          ),
        ),
        data: (items) {
          if (items.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Icon(Icons.location_off, size: 64, color: GrilyageTheme.textMuted),
                const SizedBox(height: 16),
                Text('Нет сохранённых адресов', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: 8),
                const Text('Нажмите + чтобы добавить', style: TextStyle(color: GrilyageTheme.textWood)),
                ],
              ),
            );
          }
          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: items.length,
            itemBuilder: (context, i) {
              final addr = items[i];
              return Card(
                margin: const EdgeInsets.only(bottom: 12),
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Row(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Container(
                        width: 44, height: 44,
                        decoration: BoxDecoration(
                          color: GrilyageTheme.gold.withValues(alpha: 0.15),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.location_on, color: GrilyageTheme.gold, size: 22),
                      ),
                      const SizedBox(width: 14),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Text(addr.label,
                                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15)),
                                const SizedBox(width: 8),
                                if (addr.isDefault)
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: GrilyageTheme.gold.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: const Text('По умолчанию',
                                      style: TextStyle(color: GrilyageTheme.gold, fontSize: 11, fontWeight: FontWeight.w600)),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(addr.street,
                              style: const TextStyle(color: GrilyageTheme.textWood)),
                            if (addr.apartment != null && addr.apartment!.isNotEmpty)
                              Text('кв/офис ${addr.apartment}',
                                style: const TextStyle(color: GrilyageTheme.textMuted, fontSize: 13)),
                          ],
                        ),
                      ),
                      IconButton(
                        onPressed: () => _deleteAddress(addr),
                        icon: const Icon(Icons.delete_outline, color: GrilyageTheme.error, size: 20),
                      ),
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: _showAddSheet,
        child: const Icon(Icons.add),
      ),
    );
  }
}
