import bcrypt from 'bcrypt';

/**
 * A helper function to interface with bcrypt and keep consistent parameters
 * @param pass The password to hash
 * @returns A hash of pass
 */
export async function hashPassword(pass: string): Promise<string> {
    return bcrypt.hash(pass, 10);
}