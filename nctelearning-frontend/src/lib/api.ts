export const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "";

export const apiUrl = (path: string): string => {
	console.log(process.env.NEXT_PUBLIC_API_BASE_URL);
	const base = apiBaseUrl.replace(/\/$/, '');
	const suffix = path.startsWith('/') ? path : `/${path}`;
	return `${base}${suffix}`;
};

export const withAuthHeaders = (headers: Record<string, string> = {}): Record<string, string> => {
	const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
	return token ? { ...headers, Authorization: `Bearer ${token}` } : headers;
};




