import 'package:flutter/material.dart';
import 'package:rental_car/app/theme/app_theme.dart';
import 'package:rental_car/features/home/presentation/screens/home_screen.dart';

void main() {
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
