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

        if ($request->has('created_date')) {
            // Check if created_date param is meant for sorting ('created_date' or '-created_date')
            // or filtering. Usually frontend passes it as sort. The base44Client sends sort param.
            // But base44Client.ts filter method sends params object AND sort separate.
            // If created_date is in params, we filter.
            // Here, usually we filter by exact date if provided.
        }

        // Handle sorting
        if ($request->has('sort')) {
            $sort = $request->sort;
            $direction = 'asc';
            if (str_starts_with($sort, '-')) {
                $sort = substr($sort, 1);
                $direction = 'desc';
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
            'ticket_number' => 'required|string|unique:clients,ticket_number',
            'status' => 'string',
        ]);

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
