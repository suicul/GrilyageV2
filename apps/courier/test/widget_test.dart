import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:courier/app.dart';

void main() {
  testWidgets('Courier app shows login screen when unauthenticated', (WidgetTester tester) async {
    await tester.pumpWidget(const ProviderScope(child: CourierApp()));
    await tester.pumpAndSettle();

    expect(find.text('Грильяж — Курьер'), findsOneWidget);
    expect(find.text('Войти'), findsOneWidget);
  });
}
