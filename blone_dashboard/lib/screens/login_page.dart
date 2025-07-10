import 'package:flutter/material.dart';
import 'users_page.dart';

class LoginPage extends StatelessWidget {
  const LoginPage({super.key});

  @override
  Widget build(BuildContext context) {
    final inputController = TextEditingController();
    return Scaffold(
      body: Align(
        alignment: Alignment.topCenter,
        child: ConstrainedBox(
          constraints: BoxConstraints(maxWidth: 350),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              SizedBox(height: kToolbarHeight),
              TextField(controller: inputController),
              SizedBox(height: 16),
              FilledButton(
                onPressed: () {
                  Navigator.pushReplacement(
                    context,
                    MaterialPageRoute(
                      builder: (context) =>
                          UsersPage(inputController.text.trim()),
                    ),
                  );
                },
                child: Text("Open"),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
