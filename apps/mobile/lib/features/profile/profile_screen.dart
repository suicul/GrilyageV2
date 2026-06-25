import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../core/theme/theme.dart';
import '../auth/providers.dart';
import '../cart/providers.dart';
import 'providers.dart';

class ProfileScreen extends ConsumerWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authStateProvider);
    final cartCount = ref.watch(cartProvider.select((s) => s.count));

    if (!auth.isAuthenticated) {
      return Scaffold(
        appBar: AppBar(title: const Text('Профиль')),
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.person_outline, size: 64, color: GrilyageTheme.textWood),
              const SizedBox(height: 16),
              Text('Войдите в аккаунт', style: Theme.of(context).textTheme.titleMedium),
              const SizedBox(height: 24),
              ElevatedButton(
                onPressed: () => context.push('/login'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size(200, 48),
                ),
                child: const Text('Войти'),
              ),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Профиль')),
      body: ref.watch(profileProvider).when(
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (_, __) => const Center(child: Text('Ошибка загрузки')),
        data: (user) => ListView(
          padding: const EdgeInsets.all(16),
          children: [
            _UserHeader(name: user.name, email: user.email, phone: user.phone),
            const SizedBox(height: 24),
            Text('Мои данные', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            _MenuTile(
              icon: Icons.receipt_long, title: 'Заказы', subtitle: 'История и статусы',
              onTap: () => context.push('/orders'),
            ),
            if (cartCount > 0)
              _MenuTile(
                icon: Icons.shopping_bag, title: 'Корзина',
                subtitle: '$cartCount товар(ов) на ${ref.watch(cartProvider).totalFormatted}',
                onTap: () => context.push('/cart'),
              ),
            _MenuTile(
              icon: Icons.location_on, title: 'Мои адреса',
              subtitle: 'Адреса доставки',
              onTap: () => context.push('/addresses'),
            ),
            _MenuTile(
              icon: Icons.chat_bubble_outline, title: 'Чат с оператором',
              subtitle: 'Задать вопрос',
              onTap: () => context.push('/chat'),
            ),
            const Divider(height: 32),
            Text('Приложение', style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: 8),
            _MenuTile(
              icon: Icons.map, title: 'На карте',
              subtitle: 'Как нас найти',
              onTap: () => context.push('/map'),
            ),
            _MenuTile(
              icon: Icons.info_outline, title: 'О приложении',
              subtitle: 'Версия 1.0.0',
              onTap: () => context.push('/about'),
            ),
            const SizedBox(height: 24),
            OutlinedButton.icon(
              onPressed: () async {
                await ref.read(authStateProvider.notifier).logout();
                if (context.mounted) context.go('/profile');
              },
              icon: const Icon(Icons.logout, color: GrilyageTheme.error),
              label: const Text('Выйти', style: TextStyle(color: GrilyageTheme.error)),
              style: OutlinedButton.styleFrom(
                side: const BorderSide(color: GrilyageTheme.error),
                minimumSize: const Size(double.infinity, 48),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UserHeader extends StatelessWidget {
  final String name;
  final String email;
  final String? phone;

  const _UserHeader({required this.name, required this.email, this.phone});

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Row(
          children: [
            CircleAvatar(
              radius: 32,
              backgroundColor: GrilyageTheme.gold,
              child: Text(name[0].toUpperCase(),
                style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white)),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
                  if (phone != null)
                    Text(phone!, style: const TextStyle(color: GrilyageTheme.textWood, fontSize: 14)),
                  if (email.isNotEmpty)
                    Text(email, style: const TextStyle(color: GrilyageTheme.textWood, fontSize: 13)),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _MenuTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  const _MenuTile({required this.icon, required this.title, required this.subtitle, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 4),
      child: ListTile(
        onTap: onTap,
        leading: Container(
          width: 40, height: 40,
          decoration: BoxDecoration(
            color: GrilyageTheme.gold.withValues(alpha: 0.15),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(icon, color: GrilyageTheme.gold, size: 20),
        ),
        title: Text(title, style: const TextStyle(fontWeight: FontWeight.w600)),
        subtitle: Text(subtitle, style: const TextStyle(color: GrilyageTheme.textWood, fontSize: 12)),
        trailing: const Icon(Icons.chevron_right, color: GrilyageTheme.textWood),
      ),
    );
  }
}
