import 'package:flutter/material.dart';
import 'package:rental_car/core/widgets/app_dropdown_field.dart';
import 'package:rental_car/core/widgets/app_text_field.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../widgets/add_vehicle_scaffold.dart';
import 'specifications_screen.dart';

class VehicleInfoScreen extends StatefulWidget {
  const VehicleInfoScreen({super.key});

  @override
  State<VehicleInfoScreen> createState() => _VehicleInfoScreenState();
}

class _VehicleInfoScreenState extends State<VehicleInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _modelController = TextEditingController();
  final _registrationController = TextEditingController();

  static const _brands = ['Toyota', 'Honda', 'Suzuki', 'Hyundai', 'Kia'];
  static const _categories = ['Sedan', 'SUV', 'Hatchback', 'Van', 'Truck'];
  late final List<int> _years = List.generate(
    DateTime.now().year - 1989,
    (i) => DateTime.now().year - i,
  );

  String? _brand;
  String? _category;
  late int _year = DateTime.now().year;

  @override
  void dispose() {
    _modelController.dispose();
    _registrationController.dispose();
    super.dispose();
  }

  void _onContinue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    Navigator.push(
      context,
      MaterialPageRoute(builder: (_) => const SpecificationsScreen()),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AddVehicleScaffold(
      title: 'Vehicle Info',
      step: 1,
      primaryLabel: 'Continue to Specifications',
      onPrimary: _onContinue,
      child: FormCard(
        title: 'Identification',
        subtitle: 'Basic information about the vehicle',
        icon: Icons.article_outlined,
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AppDropdownField<String>(
                label: 'Brand',
                required: true,
                hint: 'Select brand',
                items: _brands,
                value: _brand,
                onChanged: (v) => setState(() => _brand = v),
              ),
              const SizedBox(height: 12),
              AppDropdownField<String>(
                label: 'Category',
                required: true,
                hint: 'Select category',
                items: _categories,
                value: _category,
                onChanged: (v) => setState(() => _category = v),
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Model',
                required: true,
                hint: 'e.g. Corolla',
                maxLength: 100,
                controller: _modelController,
                textCapitalization: TextCapitalization.words,
                textInputAction: TextInputAction.next,
              ),
              const SizedBox(height: 12),
              AppDropdownField<int>(
                label: 'Year',
                required: true,
                items: _years,
                value: _year,
                onChanged: (v) => setState(() => _year = v ?? _year),
              ),
              const SizedBox(height: 12),
              AppTextField(
                label: 'Registration Number',
                required: true,
                hint: 'e.g. ABC-1234',
                maxLength: 50,
                controller: _registrationController,
                textCapitalization: TextCapitalization.characters,
                textInputAction: TextInputAction.done,
              ),
            ],
          ),
        ),
      ),
    );
  }
}
