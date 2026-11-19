import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:rental_car/core/widgets/custom_button.dart';

void main() {
  testWidgets('shows a spinner and disables itself while loading', (
    tester,
  ) async {
    var pressed = false;
    await tester.pumpWidget(
      MaterialApp(
        home: Scaffold(
          body: CustomButton(
            label: 'Publishing...',
            isLoading: true,
            onPressed: () => pressed = true,
          ),
        ),
      ),
    );

    expect(find.text('Publishing...'), findsOneWidget);
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
    expect(tester.getSize(find.byType(CustomButton)).height, 48);
    expect(
      tester.widget<ElevatedButton>(find.byType(ElevatedButton)).onPressed,
      isNull,
    );

    await tester.tap(find.byType(ElevatedButton));
    expect(pressed, isFalse);
  });
}
