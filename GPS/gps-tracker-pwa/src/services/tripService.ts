import { db } from "../firebase";
import { collection, doc, getDoc, getDocs, orderBy, query, setDoc, Timestamp, writeBatch, type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import type { Position, UserInfo } from "../hooks/usePathTracker";

export interface RouteMetadata {
  routeName: string;
  busType?: string;
  occupancy?: string;
}

export interface TripMetadata {
  id?: string;
  user: UserInfo;
  startTime: number;
  endTime: number;
  duration: number;
  pointCount: number;
  uploadedAt: Timestamp;
  routeName?: string;
  busType?: string;
  occupancy?: string;
  isAnalyzed?: boolean;
  tripStartTime?: Timestamp;
}

export interface TripRoute {
  path: Position[];
}

const TRIPS_COLLECTION = "trips";
const ROUTES_COLLECTION = "trip_routes";
const DRAFTS_COLLECTION = "trip_drafts";

export async function saveTemporaryPoints(draftId: string, user: UserInfo, path: Position[]): Promise<void> {
  if (!user || path.length === 0) return;
  try {
    const draftRef = doc(db, DRAFTS_COLLECTION, draftId);
    await setDoc(draftRef, {
      user,
      path,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error("[saveTemporaryPoints] Firebase error:", error);
    throw error;
  }
}

export const uploadTrip = async (
  user: UserInfo,
  path: Position[],
  routeMetadata: RouteMetadata
): Promise<string> => {
  if (!user || path.length === 0) {
    throw new Error("Invalid trip data");
  }

  const startTime = path[0].timestamp;
  const endTime = path[path.length - 1].timestamp;
  const duration = (endTime - startTime) / 1000;

  const newTripRef = doc(collection(db, TRIPS_COLLECTION));
  const tripId = newTripRef.id;

  const metadata: Omit<TripMetadata, 'id'> = {
    user,
    startTime,
    endTime,
    duration,
    pointCount: path.length,
    uploadedAt: Timestamp.now(),
    routeName: routeMetadata.routeName,
    busType: routeMetadata.busType,
    occupancy: routeMetadata.occupancy,
    isAnalyzed: false,
    tripStartTime: Timestamp.fromMillis(startTime)
  };

  const routeData: TripRoute = {
    path
  };

  try {
    console.log("Iniciando subida...");
    const batch = writeBatch(db);

    batch.set(newTripRef, metadata);

    const routeRef = doc(db, ROUTES_COLLECTION, tripId);
    batch.set(routeRef, routeData);

    await batch.commit();
    console.log("Subida completada con ID:", tripId);
    return tripId;
  } catch (error) {
    console.error("[uploadTrip] Firebase error:", error);
    throw error;
  }
};

export const getTrips = async (): Promise<TripMetadata[]> => {
  const q = query(collection(db, TRIPS_COLLECTION), orderBy("uploadedAt", "desc"));
  const querySnapshot = await getDocs(q);

  const trips: TripMetadata[] = [];
  querySnapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => {
    trips.push({ id: docSnap.id, ...docSnap.data() } as TripMetadata);
  });

  return trips;
};

export const getTripRoute = async (tripId: string): Promise<Position[]> => {
  const docRef = doc(db, ROUTES_COLLECTION, tripId);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data() as TripRoute;
    return data.path;
  }
  console.warn("No route found for trip ID:", tripId);
  return [];
};
