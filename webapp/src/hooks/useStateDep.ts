import { useEffect, useState } from 'react';

export function useStateDep<T>(defaultValue: T) {
    const [value, setValue] = useState(defaultValue);

    useEffect(() => {
        setValue(defaultValue);
    }, [defaultValue]);
    return [value, setValue] as const;
}