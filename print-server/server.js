import cors from 'cors';
import express from 'express';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const UsbPrinter = require('escpos-usb');
const iconv = require('iconv-lite');

const app = express();
const port = Number(process.env.PRINT_SERVER_PORT || 3001);
const host = process.env.PRINT_SERVER_HOST || '127.0.0.1';
const printToken = process.env.PRINT_SERVER_TOKEN;
const allowedOrigins = (
    process.env.PRINT_SERVER_ORIGINS || 'http://localhost:8000'
)
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
const requestLog = new Map();

// Middlewares
app.use(
    cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            return callback(new Error('Origin not allowed'));
        },
        methods: ['POST'],
        allowedHeaders: ['Content-Type', 'X-Print-Token'],
    }),
);
app.use(express.json({ limit: '32kb', strict: true }));

app.use((req, res, next) => {
    if (!printToken) {
        return res
            .status(503)
            .json({
                success: false,
                message: 'Print server token is not configured',
            });
    }

    if (req.get('X-Print-Token') !== printToken) {
        return res
            .status(401)
            .json({ success: false, message: 'Unauthorized' });
    }

    const now = Date.now();
    const attempts = (requestLog.get(req.ip) || []).filter(
        (timestamp) => now - timestamp < 60_000,
    );
    if (attempts.length >= 20) {
        return res
            .status(429)
            .json({ success: false, message: 'Too many print requests' });
    }
    attempts.push(now);
    requestLog.set(req.ip, attempts);
    next();
});

const safeText = (value, maxLength = 100) =>
    String(value ?? '')
        .replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ')
        .slice(0, maxLength);

const command = (...bytes) => Buffer.from(bytes);
const encodeText = (value) => iconv.encode(`${value}\n`, 'cp858');

const qrCodeCommands = (value) => {
    const data = iconv.encode(value, 'utf8');
    const storeLength = data.length + 3;

    return [
        command(0x1d, 0x28, 0x6b, 0x04, 0x00, 0x31, 0x41, 0x32, 0x00),
        command(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x43, 0x06),
        command(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x45, 0x30),
        command(
            0x1d,
            0x28,
            0x6b,
            storeLength & 0xff,
            (storeLength >> 8) & 0xff,
            0x31,
            0x50,
            0x30,
        ),
        data,
        command(0x1d, 0x28, 0x6b, 0x03, 0x00, 0x31, 0x51, 0x30),
    ];
};

const buildTicket = (ticketData) => {
    const chunks = [
        command(0x1b, 0x40),
        command(0x1b, 0x61, 0x01),
        command(0x1b, 0x45, 0x01),
        command(0x1d, 0x21, 0x11),
        encodeText(safeText(ticketData.shopName || 'Boutique Havifin')),
        command(0x1d, 0x21, 0x00),
        command(0x1b, 0x45, 0x00),
        encodeText(''),
        encodeText(safeText(ticketData.address || 'Adresse de la boutique')),
        encodeText('--------------------------------'),
        command(0x1b, 0x61, 0x00),
        encodeText(`Ref: ${safeText(ticketData.reference || 'N/A', 60)}`),
        encodeText(
            `Date: ${safeText(ticketData.date || new Date().toLocaleString(), 60)}`,
        ),
        encodeText('--------------------------------'),
    ];

    if (Array.isArray(ticketData.items)) {
        ticketData.items.slice(0, 50).forEach((item) => {
            const name = safeText(item.name, 20).padEnd(22, ' ');
            const price = safeText(item.amount || '0', 10).padStart(10, ' ');
            chunks.push(encodeText(`${name}${price}`));
        });
    }

    chunks.push(
        encodeText('--------------------------------'),
        command(0x1b, 0x61, 0x02),
    );

    if (ticketData.amount) {
        chunks.push(
            command(0x1d, 0x21, 0x11),
            encodeText(
                `TOTAL: ${safeText(ticketData.amount, 24)} ${safeText(ticketData.currency || 'FC', 3)}`,
            ),
            command(0x1d, 0x21, 0x00),
            encodeText('--------------------------------'),
        );
    }

    chunks.push(
        command(0x1b, 0x61, 0x01),
        encodeText(ticketData.amount ? 'Merci de votre visite !' : ''),
        encodeText(''),
    );

    if (ticketData.qrData) {
        chunks.push(
            ...qrCodeCommands(safeText(ticketData.qrData, 256)),
            encodeText(''),
        );
    }

    chunks.push(command(0x1d, 0x56, 0x00));

    return Buffer.concat(chunks);
};

// Print Endpoint
app.post('/print', (req, res) => {
    try {
        const ticketData = req.body;

        if (!ticketData) {
            return res
                .status(400)
                .json({ success: false, message: 'Invalid ticket data' });
        }

        // Auto-detect the first USB printer. A VID/PID can be passed to the
        // adapter later if a workstation has multiple printers.
        let device;
        try {
            device = new UsbPrinter();
        } catch (usbError) {
            console.error('Error detecting printer:', usbError);
            return res
                .status(500)
                .json({
                    success: false,
                    message: 'Printer not found or disconnected',
                });
        }

        device.open((error) => {
            if (error) {
                console.error('Error opening printer:', error);
                return res
                    .status(500)
                    .json({
                        success: false,
                        message: 'Printer not found or disconnected',
                    });
            }

            try {
                device.write(buildTicket(ticketData), (writeError) => {
                    device.close();

                    if (writeError) {
                        console.error('USB write error:', writeError);
                        return res
                            .status(500)
                            .json({
                                success: false,
                                message: 'Printing error',
                            });
                    }

                    console.log(
                        'Ticket printed successfully',
                        safeText(ticketData.reference, 60),
                    );
                    return res
                        .status(200)
                        .json({ success: true, message: 'Ticket printed' });
                });
            } catch (printError) {
                console.error('Error during formatting/printing:', printError);
                device.close();
                res.status(500).json({
                    success: false,
                    message: 'Printing error',
                });
            }
        });
    } catch (err) {
        console.error('Server error:', err);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
        });
    }
});

app.listen(port, host, () => {
    console.log(`🖨️  Print bridge is running on http://${host}:${port}`);
    console.log(`🔌 Listening to POST requests on /print`);
});
