import 'package:flutter/material.dart';
import 'package:rental_car/app/theme/app_theme.dart';
import 'package:rental_car/core/network/api_client.dart';
import 'package:rental_car/features/home/presentation/screens/home_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await apiClient.restoreSession().timeout(
      const Duration(seconds: 5),
      onTimeout: () => false,
    );
  } catch (_) {
    // Fall through to the normal sign-in flow.
  }
  runApp(const RentalCar());
}

class RentalCar extends StatelessWidget {
  const RentalCar({super.key});
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'AI Rental Car',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light,
      home: const HomeScreen(),
    );
  }
}
