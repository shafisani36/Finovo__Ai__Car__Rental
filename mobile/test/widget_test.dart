import 'package:material_ui/material_ui.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:rental_car/main.dart';

void main() {
  testWidgets('opens the navigation drawer', (WidgetTester tester) async {
    await tester.pumpWidget(const RentalCar());

    await tester.tap(find.byIcon(Icons.menu));
    await tester.pump();

    expect(find.text('Finovo'), findsNWidgets(2));
    expect(find.text('Dashboard'), findsOneWidget);
    expect(find.text('Cars'), findsNWidgets(2));
    expect(find.text('Light mode'), findsOneWidget);
    expect(find.text('Log out'), findsOneWidget);
  });
}
