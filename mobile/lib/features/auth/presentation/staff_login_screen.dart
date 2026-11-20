import 'package:material_ui/material_ui.dart';
import 'package:rental_car/app/theme/app_colors.dart';
import 'package:rental_car/app/theme/app_text_theme.dart';
import 'package:rental_car/core/network/api_client.dart';
import 'package:rental_car/core/widgets/app_text_field.dart';
import 'package:rental_car/core/widgets/custom_button.dart';
import 'package:rental_car/features/add_vehicle/models/add_vehicle_draft.dart';
import 'package:rental_car/features/add_vehicle/presentation/screens/vehicle_info_screen.dart';
import 'package:rental_car/features/auth/data/auth_repository.dart';

class StaffLoginScreen extends StatefulWidget {
  const StaffLoginScreen({super.key, this.continueToAddVehicle = true});

  final bool continueToAddVehicle;

  @override
  State<StaffLoginScreen> createState() => _StaffLoginScreenState();
}

class _StaffLoginScreenState extends State<StaffLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _isSubmitting = false;
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    if (_isSubmitting || !(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _isSubmitting = true);
    try {
      await AuthRepository().signIn(
        email: _emailController.text,
        password: _passwordController.text,
      );
      if (!mounted) return;
      if (!widget.continueToAddVehicle) {
        Navigator.of(context).pop(true);
        return;
      }
      Navigator.of(context).push(
        MaterialPageRoute<void>(
          builder: (_) => VehicleInfoScreen(draft: AddVehicleDraft()),
        ),
      );
    } on ApiException catch (error) {
      if (mounted) _showError(error.message);
    } on FormatException catch (error) {
      if (mounted) _showError(error.message);
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red.shade700),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Fleet staff sign in')),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(20),
            child: Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Text(
                    'Sign in to manage fleet vehicles',
                    style: AppTextStyles.heading5,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    'Use an administrator, super administrator, or fleet manager account.',
                    style: AppTextStyles.subtitle3.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 24),
                  AppTextField(
                    controller: _emailController,
                    keyboardType: .emailAddress,
                    required: true,
                    textInputAction: .next,
                    label: "Email",
                    hint: "Enter email...",
                    validator: (value) {
                      final email = value?.trim() ?? '';
                      if (email.isEmpty || !email.contains('@')) {
                        return 'Enter a valid email address';
                      }
                      return null;
                    },
                  ),
                  const SizedBox(height: 14),
                  AppTextField(
                    controller: _passwordController,
                    obscureText: _obscurePassword,
                    required: true,
                    label: "Password",
                    hint: "Enter password...",
                    keyboardType: .visiblePassword,
                    textInputAction: .done,
                    suffix: IconButton(
                      onPressed: () =>
                          setState(() => _obscurePassword = !_obscurePassword),
                      icon: Icon(
                        _obscurePassword
                            ? Icons.visibility_off_outlined
                            : Icons.visibility_outlined,
                      ),
                    ),
                    validator: (value) => value == null || value.isEmpty
                        ? 'Password is required'
                        : null,
                    onFieldSubmitted: (_) {
                      _signIn();
                    },
                  ),
                  const SizedBox(height: 22),
                  CustomButton(
                    label: _isSubmitting ? 'Signing in...' : 'Sign in',
                    isLoading: _isSubmitting,
                    onPressed: _signIn,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
