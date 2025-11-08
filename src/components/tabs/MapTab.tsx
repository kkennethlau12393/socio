import { Event } from '../../types';
import { EventMap } from '../EventMap';

interface MapTabProps {
  onEventClick: (event: Event) => void;
}

export const MapTab = ({ onEventClick }: MapTabProps) => {
  return (
    <div className="h-screen w-full">
      <EventMap onEventClick={onEventClick} />
    </div>
  );
};
