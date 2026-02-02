<?php

namespace App\Http\Controllers;

use App\Models\Client;
use Illuminate\Http\Request;

class ClientController extends Controller
{
    public function index(Request $request)
    {
        $query = Client::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Default to current active session if not filtering by date/session specifically
        if (!$request->has('session_id') && !$request->has('date')) {
            $user = $request->user();
            if ($user) {
                $shopIds = $user->shops()->pluck('shops.id');
                if ($shopIds->isNotEmpty()) {
                    $activeSessionIds = \App\Models\Session::open()
                        ->latest('session_date')
                        ->whereIn('shop_id', $shopIds)
                        ->pluck('id');
                    
                    if ($activeSessionIds->isNotEmpty()) {
                        $query->whereIn('session_id', $activeSessionIds);
                    }
                }
            }
        }

        if ($request->has('session_id')) {
            $query->where('session_id', $request->session_id);
        }

        if ($request->has('date')) {
            $date = $request->date;
            $query->whereHas('session', function ($q) use ($date) {
                $q->whereDate('session_date', $date);
            });
        }

        // Handle sorting
        if ($request->has('sort')) {
            $sort = $request->sort;
            $direction = 'asc';
            if (str_starts_with($sort, '-')) {
                $sort = substr($sort, 1);
                $direction = 'desc';
            }
            // Map frontend naming to DB naming if necessary
            if ($sort === 'created_date') {
                $sort = 'created_at';
            }
            $query->orderBy($sort, $direction);
        } else {
            $query->orderBy('created_at', 'desc');
        }

        // Handle limit
        if ($request->has('limit')) {
            $query->limit($request->limit);
        }

        return $query->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'phone' => 'required|string',
            'operation_type' => 'required|string',
            'service' => 'required|string',
            'status' => 'string',
            'amount' => 'nullable|numeric',
            'amount_from' => 'nullable|numeric',
            'exchange_rate' => 'nullable|numeric',
            'currency_from' => 'nullable|string',
            'currency_to' => 'nullable|string',
            'first_name' => 'nullable|string',
            'last_name' => 'nullable|string',
            'metadata' => 'nullable|array',
            'is_registered' => 'nullable|boolean',
            'notes' => 'nullable|string',
        ]);

        $user = $request->user();
        
        // Handle unauthenticated kiosk requests possibly? 
        // Assuming auth middleware is present or user is derived. 
        // Actually for Kiosk (public endpoint?) user might be null? 
        // Looking at previous code `$user = $request->user(); if ($user)...` suggests it might be optional?
        // But `owner` global scope requires auth. Let's assume Kiosk is authenticated as a "shop" user or similar.
        // Wait, ClientForm uses `base44` client which likely sends auth token. 
        
        $shopId = null;
        if ($user) {
             if (in_array($user->role, ['manager', 'cashier', 'client'])) {
                $shopId = $user->shops()->first()?->id;
                if ($shopId) {
                    $validated['shop_id'] = $shopId;
                }
            }
        }
        
        // If we have a shop, we MUST have a session to generate a ticket
        if ($shopId) {
            $activeSession = \App\Models\Session::open()->where('shop_id', $shopId)->first();
            
            if (!$activeSession) {
                 return response()->json([
                    'error' => 'Agence fermée',
                    'message' => 'Veuillez patienter qu\'une session soit ouverte par le manager.'
                ], 403);
            }
            
            $validated['session_id'] = $activeSession->id;
            
            // Generate Ticket Number
            // Count clients in this session to determine next number
            // Using logic: Next = Count + 1
            $currentCount = \App\Models\Client::where('session_id', $activeSession->id)->count();
            $nextNumber = $currentCount + 1;
            $validated['ticket_number'] = str_pad($nextNumber, 3, '0', STR_PAD_LEFT);
            
        } else {
             // Fallback for non-shop/super-admin/testing context if needed?
             // Or maybe valid for super-admin creating client directly?
             // For now, let's keep it simple. If no session, maybe random or required?
             // The requirement is specific to "sessions", so implies shop context.
             if (!isset($validated['ticket_number'])) {
                  // Fallback if no session found (rare/edge case)
                  $validated['ticket_number'] = str_pad(mt_rand(1, 999), 3, '0', STR_PAD_LEFT);
             }
        }

        $client = Client::create($validated);

        return response()->json($client, 201);
    }

    public function show(Client $client)
    {
        return $client;
    }

    public function update(Request $request, Client $client)
    {
        $client->update($request->all());
        return $client;
    }
}
