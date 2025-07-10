import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class UsersPage extends StatelessWidget {
  final String password;

  const UsersPage(this.password, {super.key});

  Future<List<dynamic>> fetchUsers() async {
    // Get the current base URL from window.location
    final baseUrl = Uri.base.origin;
    
    final response = await http.post(
      Uri.parse('$baseUrl/dashboard/api/users'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({'dashboardPassword': password}),
    );

    print(response.statusCode);
    if (response.statusCode == 200) {
      print(response.body);
      return jsonDecode(response.body);
    } else {
      throw Exception('Failed to load users');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text("Blone Dashboard")),
      body: FutureBuilder<List<dynamic>>(
        future: fetchUsers(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          } else if (!snapshot.hasData || snapshot.data!.isEmpty) {
            return Center(child: Text('No users found'));
          }

          return ListView.builder(
            itemCount: snapshot.data!.length,
            itemBuilder: (context, index) {
              final user = snapshot.data![index];
              return ListTile(
                title: Text(user['pubkey'] ?? ''),
                subtitle: Text(
                  'Storage: ${user['bytes_stored'] ?? 0} / ${user['max_bytes_stored'] ?? 0} bytes',
                ),
                trailing: Text('Credit: ${user['credit'] ?? 0}'),
              );
            },
          );
        },
      ),
    );
  }
}
