import 'package:material_ui/material_ui.dart';
import 'package:rental_car/features/add_vehicle/data/add_vehicle_repository.dart';
import 'package:rental_car/features/add_vehicle/models/add_vehicle_draft.dart';
import 'package:rental_car/core/widgets/app_dropdown_field.dart';
import 'package:rental_car/core/widgets/app_text_field.dart';
import 'package:rental_car/features/add_vehicle/presentation/widgets/form_card.dart';

import '../widgets/add_vehicle_scaffold.dart';
import 'specifications_screen.dart';

class VehicleInfoScreen extends StatefulWidget {
  const VehicleInfoScreen({super.key, required this.draft});

  final AddVehicleDraft draft;

  @override
  State<VehicleInfoScreen> createState() => _VehicleInfoScreenState();
}

class _VehicleInfoScreenState extends State<VehicleInfoScreen> {
  final _formKey = GlobalKey<FormState>();
  final _modelController = TextEditingController();
  final _registrationController = TextEditingController();
  final _repository = AddVehicleRepository();

  static const _brands = ['Toyota', 'Honda', 'Suzuki', 'Hyundai', 'Kia'];
  late final List<int> _years = List.generate(
    DateTime.now().year + 2 - 1970,
    (i) => DateTime.now().year + 1 - i,
  );

  late String? _brand = widget.draft.brand;
  late int _year = widget.draft.year;
  late Future<List<VehicleCategory>> _categories;
  bool _isLoadingCategories = true;

  @override
  void initState() {
    super.initState();
    _modelController.text = widget.draft.model;
    _registrationController.text = widget.draft.registrationNumber;
    _categories = _requestCategories();
  }

  Future<List<VehicleCategory>> _requestCategories() {
    return _repository.getCategories().whenComplete(() {
      if (!mounted) return;
      setState(() => _isLoadingCategories = false);
    });
  }

  void _retryCategories() {
    setState(() {
      _isLoadingCategories = true;
      _categories = _requestCategories();
    });
  }

  @override
  void dispose() {
    _modelController.dispose();
    _registrationController.dispose();
    super.dispose();
  }

  void _onContinue() {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    widget.draft
      ..brand = _brand
      ..model = _modelController.text.trim()
      ..year = _year
      ..registrationNumber = _registrationController.text.trim();
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => SpecificationsScreen(draft: widget.draft),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AddVehicleScaffold(
      title: 'Vehicle Info',
      step: 1,
      primaryLabel: _isLoadingCategories
          ? 'Loading categories...'
          : 'Continue to Specifications',
      onPrimary: _onContinue,
      isSubmitting: _isLoadingCategories,
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
              FutureBuilder<List<VehicleCategory>>(
                future: _categories,
                builder: (context, snapshot) {
                  if (snapshot.hasError) {
                    return Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Could not load vehicle categories.',
                          style: TextStyle(color: Colors.red.shade700),
                        ),
                        TextButton(
                          onPressed: _retryCategories,
                          child: const Text('Try again'),
                        ),
                      ],
                    );
                  }
                  final categories = snapshot.data ?? const <VehicleCategory>[];
                  final selected = categories
                      .where(
                        (category) => category.id == widget.draft.category?.id,
                      )
                      .firstOrNull;
                  return AppDropdownField<VehicleCategory>(
                    label: 'Category',
                    required: true,
                    hint: snapshot.connectionState == ConnectionState.waiting
                        ? 'Loading categories...'
                        : 'Select category',
                    items: categories,
                    value: selected,
                    itemLabel: (category) => category.name,
                    enabled: snapshot.connectionState == ConnectionState.done,
                    onChanged: (value) =>
                        setState(() => widget.draft.category = value),
                  );
                },
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
                validator: (value) {
                  final model = value?.trim() ?? '';
                  if (model.isEmpty) return 'Model is required';
                  if (model.length > 64) {
                    return 'Model must be 64 characters or fewer';
                  }
                  return null;
                },
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
                validator: (value) {
                  final registration = value?.trim() ?? '';
                  if (registration.isEmpty) {
                    return 'Registration number is required';
                  }
                  if (registration.length > 32) {
                    return 'Registration number must be 32 characters or fewer';
                  }
                  return null;
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}
