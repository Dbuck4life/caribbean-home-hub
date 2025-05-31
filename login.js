javascriptimport { PlanetScaleDatabase } from '../../../lib/database.js';
import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }
    
    try {
        const { email, password } = req.body;
        
        // Validate input
        if (!email || !password) {
            return res.status(400).json({ 
                message: 'Email and password are required' 
            });
        }
        
        // Initialize database connection
        const db = new PlanetScaleDatabase();
        
        // Find user by email
        const user = await db.findUserByEmail(email);
        
        if (!user) {
            // Log failed attempt
            await db.logActivity({
                action: 'login_failed',
                email,
                reason: 'user_not_found',
                ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                timestamp: new Date()
            });
            
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }
        
        // Verify password
        const isValidPassword = await compare(password, user.password_hash);
        
        if (!isValidPassword) {
            // Log failed attempt
            await db.logActivity({
                action: 'login_failed',
                email,
                reason: 'invalid_password',
                ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                timestamp: new Date()
            });
            
            return res.status(401).json({ 
                message: 'Invalid email or password' 
            });
        }
        
        // Check if user is active
        if (!user.is_active) {
            return res.status(401).json({ 
                message: 'Account is disabled. Contact administrator.' 
            });
        }
        
        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                email: user.email, 
                role: user.role,
                name: user.name
            },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        // Set secure HTTP-only cookie
        res.setHeader('Set-Cookie', `auth_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`);
        
        // Update last login
        await db.updateLastLogin(user.id);
        
        // Log successful login
        await db.logActivity({
            action: 'login_success',
            user_id: user.id,
            email,
            role: user.role,
            ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress,
            timestamp: new Date()
        });
        
        // Return user data (excluding password)
        const userData = {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions
        };
        
        return res.status(200).json(userData);
        
    } catch (error) {
        console.error('Login error:', error);
        
        return res.status(500).json({ 
            message: 'Internal server error' 
        });
    }
}