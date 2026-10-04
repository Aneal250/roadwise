"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { resolvePlace, searchPlaces } from "@/lib/places";
import type { GeocodedPlace, PlaceSuggestion } from "@/lib/types";

type LocationFieldProps = {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  icon: ReactNode;
  pinClass: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onPlaceSelect: (place: GeocodedPlace) => void;
};

export function LocationField({
  id,
  label,
  placeholder,
  value,
  icon,
  pinClass,
  disabled,
  onValueChange,
  onPlaceSelect,
}: LocationFieldProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const sessionToken = useRef(crypto.randomUUID());
  const skipSearch = useRef(false);
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [active, setActive] = useState(0);
  const [searching, setSearching] = useState(false);
  const [hint, setHint] = useState("");

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (skipSearch.current) {
      skipSearch.current = false;
      return;
    }
    const query = value.trim();
    if (!open || query.length < 2) {
      setSuggestions([]);
      setHint("");
      setSearching(false);
      return;
    }

    let ignore = false;
    const handle = window.setTimeout(() => {
      void (async () => {
        setSearching(true);
        try {
          const rows = await searchPlaces(query, sessionToken.current);
          if (ignore) return;
          setSuggestions(rows);
          setActive(0);
          setHint(rows.length ? "" : `No Google locations for “${query}”.`);
        } catch (err) {
          if (ignore) return;
          setSuggestions([]);
          setHint(err instanceof Error ? err.message : "Google location search failed.");
        } finally {
          if (!ignore) setSearching(false);
        }
      })();
    }, 280);

    return () => {
      ignore = true;
      window.clearTimeout(handle);
    };
  }, [open, value]);

  async function choose(suggestion: PlaceSuggestion) {
    setSearching(true);
    setHint("");
    try {
      const place = await resolvePlace(suggestion.placeId, sessionToken.current, suggestion.label);
      sessionToken.current = crypto.randomUUID();
      skipSearch.current = true;
      setSuggestions([]);
      setOpen(false);
      onPlaceSelect(place);
    } catch (err) {
      setHint(err instanceof Error ? err.message : "Could not load that Google location.");
    } finally {
      setSearching(false);
    }
  }

  const showMenu = open && value.trim().length >= 2;

  return (
    <div className="location-field" ref={rootRef}>
      <div className="input-shell">
        <span className={`input-pin ${pinClass}`}>{icon}</span>
        <input
          id={id}
          role="combobox"
          required
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={showMenu}
          aria-controls={listId}
          aria-activedescendant={showMenu && suggestions[active] ? `${id}-option-${active}` : undefined}
          onClick={() => setOpen(true)}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setOpen(true);
            onValueChange(event.target.value);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown" && suggestions.length) {
              event.preventDefault();
              setOpen(true);
              setActive((index) => (index + 1) % suggestions.length);
            } else if (event.key === "ArrowUp" && suggestions.length) {
              event.preventDefault();
              setActive((index) => (index - 1 + suggestions.length) % suggestions.length);
            } else if (event.key === "Escape") {
              setOpen(false);
            } else if (event.key === "Enter" && showMenu && suggestions[active]) {
              event.preventDefault();
              void choose(suggestions[active]);
            }
          }}
        />
      </div>
      {showMenu && (
        <div className="location-menu" id={listId} role="listbox" aria-label={label}>
          {searching && !suggestions.length && <p className="location-status">Searching Google…</p>}
          {hint && <p className="location-status">{hint}</p>}
          {suggestions.map((suggestion, index) => (
            <button
              id={`${id}-option-${index}`}
              key={suggestion.placeId}
              type="button"
              role="option"
              aria-selected={index === active}
              data-active={index === active}
              onMouseEnter={() => setActive(index)}
              onClick={() => void choose(suggestion)}
            >
              <b>{suggestion.mainText}</b>
              {suggestion.secondaryText && <small>{suggestion.secondaryText}</small>}
            </button>
          ))}
          <p className="places-credit">
            <img
              src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png"
              alt="Powered by Google"
            />
          </p>
        </div>
      )}
    </div>
  );
}
