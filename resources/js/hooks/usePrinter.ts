import axios from 'axios';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

// Optional interface definition for strong typing based on what TicketService provides
export interface TicketData {
    shopName: string;
    address: string;
    reference: string;
    date: string;
    amount: string;
    currency: string;
    items?: Array<{ name: string; amount: string }>;
    qrData?: string;
}

export function usePrinter() {
    const [isPrinting, setIsPrinting] = useState<boolean>(false);

    /**
     * Sends the ticket data to the local Node.js bridge to print via USB.
     *
     * @param ticketData The formatted payload from the backend TicketService
     * @param retryCount Internal retry counter, do not pass.
     */
    const printTicket = useCallback(async function printTicket(
        ticketData: TicketData,
        retryCount = 0,
    ): Promise<boolean> {
        setIsPrinting(true);

        // We use localhost by default since the bridge runs on the same machine the browser is on
        const printerServerUrl =
            import.meta.env.VITE_PRINT_SERVER_URL ||
            'http://127.0.0.1:3001/print';
        const printToken = import.meta.env.VITE_PRINT_SERVER_TOKEN;

        if (!printToken) {
            toast.error(
                "Le jeton du serveur d'impression n'est pas configuré.",
            );
            setIsPrinting(false);
            return false;
        }

        try {
            const response = await axios.post(printerServerUrl, ticketData, {
                timeout: 5000, // 5 seconds timeout
                headers: {
                    'X-Print-Token': printToken,
                },
            });

            if (response.data.success) {
                toast.success('Impression réussie', {
                    description: `Le ticket ${ticketData.reference} a été imprimé.`,
                });
                setIsPrinting(false);
                return true;
            } else {
                throw new Error(
                    response.data.message ||
                        "Erreur imprévue lors de l'impression",
                );
            }
        } catch (error: any) {
            console.error("Erreur d'impression", error);

            if (retryCount < 2) {
                // Retry automatically up to 2 times
                console.log(`Nouvelle tentative (${retryCount + 1}/2)...`);
                return await printTicket(ticketData, retryCount + 1);
            }

            toast.error("Échec de l'impression", {
                description:
                    "Vérifiez que le service local tourne et que l'imprimante est branchée (USB).",
                action: {
                    label: 'Réessayer',
                    onClick: () => printTicket(ticketData, 0),
                },
            });

            setIsPrinting(false);
            return false;
        }
    }, []);

    return {
        printTicket,
        isPrinting,
    };
}
