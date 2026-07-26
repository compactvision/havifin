<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientPhone;
use App\Support\TenantAccess;
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

        $phone = preg_replace('/[\s().-]+/', '', (string) $request->phone);
        $shopIds = TenantAccess::shopIds($request->user());

        $client = Client::where('phone', $phone)
            ->where('is_registered', true)
            ->whereIn('shop_id', $shopIds)
            ->first();

        if (! $client) {
            $clientPhone = ClientPhone::where('phone_number', $phone)
                ->whereIn('shop_id', $shopIds)
                ->first();
            if ($clientPhone) {
                $client = $clientPhone->client;
            }
        }

        if ($client && $client->is_registered) {
            if ($request->user()->isClient()) {
                return response()->json([
                    'exists' => true,
                    'client' => [
                        'id' => $client->id,
                        'first_name' => $client->first_name,
                        'last_name' => $client->last_name,
                        'phone' => $client->phone,
                    ],
                ]);
            }

            return response()->json([
                'exists' => true,
                'client' => [
                    'id' => $client->id,
                    'first_name' => $client->first_name,
                    'last_name' => $client->last_name,
                    'email' => $client->email,
                    'address' => $client->address,
                    'phone' => $client->phone,
                    'phones' => $client->phones->map(fn ($p) => [
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
            'address' => 'nullable|string|max:500',
            'shop_id' => 'sometimes|integer|exists:shops,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'messages' => $validator->errors(),
            ], 422);
        }

        $creator = $request->user();
        $ownerId = TenantAccess::ownerId($creator);
        $shopId = TenantAccess::resolveShopId($creator, $request->input('shop_id'));
        $phone = preg_replace('/[\s().-]+/', '', (string) $request->phone);

        $existingClient = Client::where('phone', $phone)
            ->where('shop_id', $shopId)
            ->first();

        if ($existingClient?->is_registered) {
            return response()->json([
                'error' => 'Ce numéro est déjà enregistré',
            ], 409);
        }

        $client = DB::transaction(function () use ($request, $existingClient, $phone, $ownerId, $shopId) {
            $client = Client::updateOrCreate(
                ['id' => $existingClient?->id],
                [
                    'phone' => $phone,
                    'first_name' => $request->first_name,
                    'last_name' => $request->last_name,
                    'email' => $request->email,
                    'address' => $request->address,
                    'is_registered' => true,
                    'owner_id' => $ownerId,
                    'shop_id' => $shopId,
                ]
            );

            // Create primary phone entry
            ClientPhone::updateOrCreate(
                [
                    'client_id' => $client->id,
                    'phone_number' => $phone,
                ],
                [
                    'is_primary' => true,
                    'owner_id' => $ownerId,
                    'shop_id' => $shopId,
                ]
            );

            return $client;
        });

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

        $creator = $request->user();
        $client = Client::findOrFail($request->client_id);
        TenantAccess::authorizeShop($creator, $client->shop_id);
        $phoneNumber = preg_replace('/[\s().-]+/', '', (string) $request->phone_number);

        $existingPhone = ClientPhone::where('client_id', $client->id)
            ->where('phone_number', $phoneNumber)
            ->exists();

        if ($existingPhone) {
            return response()->json([
                'error' => 'Ce numéro est déjà associé à ce client',
            ], 409);
        }

        $phone = ClientPhone::create([
            'client_id' => $client->id,
            'phone_number' => $phoneNumber,
            'is_primary' => false,
            'owner_id' => TenantAccess::ownerId($creator),
            'shop_id' => $client->shop_id,
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
    }
}
