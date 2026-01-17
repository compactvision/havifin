<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientPhone;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class ClientVerificationController extends Controller
{
    /**
     * Verify if a phone number exists in the system.
     */
    public function verifyPhone(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $phone = $request->phone;

        // Check in clients table (primary phone)
        $client = Client::where('phone', $phone)
            ->where('is_registered', true)
            ->first();

        // If not found, check in client_phones table
        if (!$client) {
            $clientPhone = ClientPhone::where('phone_number', $phone)->first();
            if ($clientPhone) {
                $client = $clientPhone->client;
            }
        }

        if ($client && $client->is_registered) {
            return response()->json([
                'exists' => true,
                'client' => [
                    'id' => $client->id,
                    'first_name' => $client->first_name,
                    'last_name' => $client->last_name,
                    'email' => $client->email,
                    'address' => $client->address,
                    'phone' => $client->phone,
                    'phones' => $client->phones->map(fn($p) => [
                        'id' => $p->id,
                        'phone_number' => $p->phone_number,
                        'is_primary' => $p->is_primary,
                    ]),
                ],
            ]);
        }

        return response()->json([
            'exists' => false,
            'message' => 'Nouveau client',
        ]);
    }

    /**
     * Register a new client with their information.
     */
    public function register(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'phone' => 'required|string',
            'first_name' => 'required|string|max:255',
            'last_name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'address' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Check if phone already exists
            $existingClient = Client::where('phone', $request->phone)->first();
            
            if ($existingClient && $existingClient->is_registered) {
                return response()->json([
                    'error' => 'Ce numéro est déjà enregistré',
                ], 409);
            }

            // Create or update client
            $client = Client::updateOrCreate(
                ['phone' => $request->phone],
                [
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'email' => $request->email,
                    'address' => $request->address,
                    'is_registered' => true,
                ]
            );

            // Create primary phone entry
            ClientPhone::updateOrCreate(
                [
                    'client_id' => $client->id,
                    'phone_number' => $request->phone,
                ],
                [
                    'is_primary' => true,
                ]
            );

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Client enregistré avec succès',
                'client' => [
                    'id' => $client->id,
                    'first_name' => $client->first_name,
                    'last_name' => $client->last_name,
                    'email' => $client->email,
                    'address' => $client->address,
                    'phone' => $client->phone,
                ],
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'error' => 'Erreur lors de l\'enregistrement',
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Add additional phone number to an existing client.
     */
    public function addPhone(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'client_id' => 'required|exists:clients,id',
            'phone_number' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        try {
            // Check if phone already exists for this client
            $existingPhone = ClientPhone::where('client_id', $request->client_id)
                ->where('phone_number', $request->phone_number)
                ->first();

            if ($existingPhone) {
                return response()->json([
                    'error' => 'Ce numéro est déjà associé à ce client',
                ], 409);
            }

            $phone = ClientPhone::create([
                'client_id' => $request->client_id,
                'phone_number' => $request->phone_number,
                'is_primary' => false,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Numéro ajouté avec succès',
                'phone' => [
                    'id' => $phone->id,
                    'phone_number' => $phone->phone_number,
                    'is_primary' => $phone->is_primary,
                ],
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Erreur lors de l\'ajout du numéro',
                'message' => $e->getMessage(),
            ], 500);
        }
    }
}
