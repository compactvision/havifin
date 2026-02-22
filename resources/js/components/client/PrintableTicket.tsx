import React from 'react';

interface PrintableTicketProps {
    ticketNumber: string;
    waitingAhead?: number;
    details?: {
        operation_type?: string;
        service?: string;
        amount?: string | number;
        currency?: string;
        customer_name?: string;
    };
}

export const PrintableTicket: React.FC<PrintableTicketProps> = ({
    ticketNumber,
    waitingAhead = 0,
    details,
}) => {
    const now = new Date();
    const dateStr = now.toLocaleDateString('fr-FR');
    const timeStr = now.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <div
            id="printable-ticket"
            style={{
                width: '58mm',
                fontFamily: 'monospace',
                fontSize: '12px',
                color: 'black',
                backgroundColor: 'white',
                padding: '4px',
            }}
        >
            <div
                style={{
                    textAlign: 'center',
                    borderBottom: '1px dashed black',
                    paddingBottom: '8px',
                    marginBottom: '8px',
                }}
            >
                <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                    HAVIFIN
                </div>
                <div style={{ fontSize: '10px' }}>
                    {dateStr} - {timeStr}
                </div>
            </div>

            <div
                style={{
                    textAlign: 'center',
                    padding: '10px 0',
                    borderBottom: '1px dashed black',
                    marginBottom: '8px',
                }}
            >
                <div style={{ fontSize: '10px', textTransform: 'uppercase' }}>
                    Ticket No.
                </div>
                <div style={{ fontSize: '32px', fontWeight: 'bold' }}>
                    {ticketNumber}
                </div>
                {waitingAhead > 0 && (
                    <div
                        style={{
                            fontSize: '11px',
                            marginTop: '4px',
                            fontWeight: 'bold',
                        }}
                    >
                        {waitingAhead === 1
                            ? 'Il y a 1 personne devant vous'
                            : `Il y a ${waitingAhead} personnes devant vous`}
                    </div>
                )}
            </div>

            <div style={{ marginBottom: '8px' }}>
                {details?.service && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}
                    >
                        <span>Service:</span>
                        <span>{details.service}</span>
                    </div>
                )}
                {details?.operation_type && (
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                        }}
                    >
                        <span>Opér.:</span>
                        <span>
                            {details.operation_type === 'retrait'
                                ? 'Retrait'
                                : 'Dépôt'}
                        </span>
                    </div>
                )}
            </div>

            <div
                style={{
                    textAlign: 'center',
                    borderTop: '1px dashed black',
                    paddingTop: '8px',
                }}
            >
                <div>MERCI DE VOTRE CONFIANCE</div>
                <div style={{ fontSize: '10px', marginTop: '4px' }}>
                    Attendez votre tour sur l'écran
                </div>
            </div>

            <div style={{ height: '40px' }} />
        </div>
    );
};
