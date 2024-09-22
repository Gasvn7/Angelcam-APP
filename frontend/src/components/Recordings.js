import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Hls from 'hls.js';
import { differenceInDays, parseISO, addDays, formatISO } from 'date-fns';

const Recording = ({ onLogout }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [streamUrl, setStreamUrl] = useState('');
  const [segments, setSegments] = useState([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [segmentSelected, setSegmentSelected] = useState(false);
  const [sortOrder, setSortOrder] = useState('desc');
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric', 
      weekday: 'short', 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: false
    }).replace(',', '');
  };

  useEffect(() => {
    const fetchStream = async () => {
      const token = localStorage.getItem('token');
      const headers = { "Authorization": `PersonalAccessToken ${token}` };

      try {
        const response = await axios.post('https://angelcam-back.onrender.com/api/recordings/', { token, camId: id });
        let { recording_start, recording_end } = response.data;

        const startDate = parseISO(recording_start);
        let endDate = parseISO(recording_end);

        if (differenceInDays(endDate, startDate) > 1) {
          endDate = addDays(startDate, 1);
          recording_end = formatISO(endDate);
        }

        const streamResponse = await axios.get(
          `https://api.angelcam.com/v1/shared-cameras/${id}/recording/stream/?start=${recording_start}&end=${recording_end}`,
          { headers }
        );
        setStreamUrl(streamResponse.data.url);

        const segmentsResponse = await axios.get(
          `https://api.angelcam.com/v1/shared-cameras/${id}/recording/timeline/?start=${recording_start}&end=${recording_end}`,
          { headers }
        );
        setSegments(segmentsResponse.data.segments);

      } catch (error) {
        if (error.response) {
          if (error.response.status === 404) {
            setError('No recordings available for this camera.');
          } else {
            setError('Error fetching the recording or stream.');
          }
        } else {
          setError('Network error or other issue.');
        }
      }
    };

    fetchStream();
  }, [id]);

  const sortSegments = (segments, order) => {
    return segments.sort((a, b) => {
      if (order === 'asc') {
        return new Date(b.start) - new Date(a.start);
      } else {
        return new Date(a.start) - new Date(b.start);
      }
    });
  };

  const handleSortChange = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
    setSegments(sortSegments([...segments], newOrder));
  };

  const handleSegmentClick = async (segment) => {
    setIsLoading(true);
    setSegmentSelected(true);

    window.scrollTo({ top: 0, behavior: 'smooth' });

    const token = localStorage.getItem('token');
    const headers = { "Authorization": `PersonalAccessToken ${token}` };

    try {
        const segmentStreamResponse = await axios.get(
            `https://api.angelcam.com/v1/shared-cameras/${id}/recording/stream/?start=${segment.start}&end=${segment.end}`,
            { headers }
        );

        setStreamUrl(segmentStreamResponse.data.url);
        setIsPlaying(false);
        if(segmentStreamResponse){
          setIsLoading(false);
        }

    } catch (error) {
        setError('Error fetching the segment stream.');
        setIsLoading(false);
    }
  };

  const handleTimelineClick = (e) => {
    const timeline = e.currentTarget;
    const clickPosition = e.nativeEvent.offsetX;
    const timelineWidth = timeline.offsetWidth;

    const clickPercentage = clickPosition / timelineWidth;
    const totalDuration = new Date(segments[segments.length - 1].end).getTime() - new Date(segments[0].start).getTime();
    const clickTime = new Date(segments[0].start).getTime() + clickPercentage * totalDuration;

    let closestSegment = segments[0];
    let smallestDifference = Math.abs(new Date(closestSegment.start).getTime() - clickTime);

    segments.forEach((segment) => {
      const segmentStartTime = new Date(segment.start).getTime();
      const segmentEndTime = new Date(segment.end).getTime();
      const difference = Math.min(
        Math.abs(segmentStartTime - clickTime),
        Math.abs(segmentEndTime - clickTime)
      );

      if (difference < smallestDifference) {
        smallestDifference = difference;
        closestSegment = segment;
      }
    });

    handleSegmentClick(closestSegment);
  };

  const handlePlay = () => {
    if (streamUrl && Hls.isSupported()) {
      setIsLoading(true);
      const video = document.getElementById('video');
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
        setIsPlaying(true);
        setIsLoading(false);
      });
    }
  };

  const handleSkip = (seconds) => {
    const video = document.getElementById('video');
    video.currentTime += seconds;
  };

  const handleLogout = () => {
    localStorage.clear();
    onLogout();
    navigate('/')
  };

  const handleBackToHome = () => {
    navigate('/');
  };

  return (
    <div className="flex flex-col items-center mt-10 w-5/6">
      <button
        className="absolute top-4 right-4 bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded"
        onClick={handleLogout}
      >
        Logout
      </button>
      <button
        className="absolute top-4 left-4 bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded"
        onClick={handleBackToHome}
      >
        Cameras
      </button>
      <h2 className="text-3xl font-bold mb-4">Camera View</h2>
      {error ? (
        <p className='text-red-500'>{error}</p>
      ) : (
        <>
          {streamUrl ? (
            <div className='w-full flex justify-evenly'>
              <div className="relative flex flex-col items-center w-full mt-10">
                {isLoading && (
                  <p className="absolute top-16 -left-12 text-blue-500 mb-4">Loading video...</p>
                )}
                {!isPlaying && (
                  <button
                    className="absolute top-0 -left-12 bg-blue-500 hover:bg-blue-700 text-white py-2 px-4 rounded mb-4 mt-4"
                    onClick={handlePlay}
                  >
                    {segmentSelected ? "Play segment" : "Play"}
                  </button>
                )}

                <video id="video" className="w-full max-w-3xl" controls></video>

                <div className="timeline-container mt-10 w-full max-w-3xl">
                  <div 
                    className="timeline relative h-10 rounded cursor-pointer"
                    style={{ backgroundColor: '#576275'}}
                    onClick={handleTimelineClick}
                  >

                    {segments.map((segment, index) => {
                      const startTime = new Date(segment.start).getTime();
                      const endTime = new Date(segment.end).getTime();
                      const segmentDuration = endTime - startTime;

                      const totalDuration = new Date(segments[segments.length - 1].end).getTime() - new Date(segments[0].start).getTime();
                      const leftPosition = ((startTime - new Date(segments[0].start).getTime()) / totalDuration) * 100;
                      const width = (segmentDuration / totalDuration) * 100;

                      return (
                        <div
                          key={index}
                          className="segment absolute h-full bg-blue-500 hover:bg-blue-700"
                          style={{ left: `${leftPosition}%`, width: `${width}%` }}
                          onClick={() => handleSegmentClick(segment)}
                        >
                          <span className="sr-only">Go to segment starting at {formatDate(segment.start)}</span>
                        </div>
                      );
                    })}

                  </div>
                </div>

                <div className="flex justify-center mt-4">
                  <button
                    className="bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded mx-2"
                    onClick={() => handleSkip(-5)}
                  >
                    -5s
                  </button>
                  <button
                    className="bg-gray-500 hover:bg-gray-700 text-white py-2 px-4 rounded mx-2"
                    onClick={() => handleSkip(5)}
                  >
                    +5s
                  </button>
                </div>
              </div>
              <div className="flex flex-col mt-2 w-96">
                <button
                  className="bg-gray-500 hover:bg-gray-700 text-white my-2 py-2 px-4 rounded"
                  onClick={handleSortChange}
                >
                  Sort by {sortOrder === 'desc' ? 'Oldest' : 'Newest'}
                </button>
                <ul className="p-2 overflow-y-auto max-h-[500px]">
                  {segments.map((segment, index) => (
                    <li key={index} className="mb-2">
                      <button
                        className="bg-gray-200 hover:bg-gray-400 text-black py-2 px-4 rounded"
                        onClick={() => handleSegmentClick(segment)}
                      >
                        Start: {formatDate(segment.start)}, End: {formatDate(segment.end)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          ) : (
            <p>Loading stream...</p>
          )}
        </>
      )}
      <footer>
        <p className='Contacto'>Contacto:</p>
        <div className='FooterIconsContainer'>
            <a className='FooterIcons' href='https://www.linkedin.com/in/gaston-moreno-1649a1213/' target='_blank' rel="noopener noreferrer">
                <p>LinkedIn</p>
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 50 50">
                    <path d="M41,4H9C6.24,4,4,6.24,4,9v32c0,2.76,2.24,5,5,5h32c2.76,0,5-2.24,5-5V9C46,6.24,43.76,4,41,4z M17,20v19h-6V20H17z M11,14.47c0-1.4,1.2-2.47,3-2.47s2.93,1.07,3,2.47c0,1.4-1.12,2.53-3,2.53C12.2,17,11,15.87,11,14.47z M39,39h-6c0,0,0-9.26,0-10 c0-2-1-4-3.5-4.04h-0.08C27,24.96,26,27.02,26,29c0,0.91,0,10,0,10h-6V20h6v2.56c0,0,1.93-2.56,5.81-2.56 c3.97,0,7.19,2.73,7.19,8.26V39z"></path>
                </svg>
            </a>
            <a className='FooterIcons' href='https://api.whatsapp.com/send/?phone=3364304755' target='_blank' rel="noopener noreferrer">
                <p>Whatsapp</p>
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 50 50">
                    <path d="M 25 2 C 12.309534 2 2 12.309534 2 25 C 2 29.079097 3.1186875 32.88588 4.984375 36.208984 L 2.0371094 46.730469 A 1.0001 1.0001 0 0 0 3.2402344 47.970703 L 14.210938 45.251953 C 17.434629 46.972929 21.092591 48 25 48 C 37.690466 48 48 37.690466 48 25 C 48 12.309534 37.690466 2 25 2 z M 25 4 C 36.609534 4 46 13.390466 46 25 C 46 36.609534 36.609534 46 25 46 C 21.278025 46 17.792121 45.029635 14.761719 43.333984 A 1.0001 1.0001 0 0 0 14.033203 43.236328 L 4.4257812 45.617188 L 7.0019531 36.425781 A 1.0001 1.0001 0 0 0 6.9023438 35.646484 C 5.0606869 32.523592 4 28.890107 4 25 C 4 13.390466 13.390466 4 25 4 z M 16.642578 13 C 16.001539 13 15.086045 13.23849 14.333984 14.048828 C 13.882268 14.535548 12 16.369511 12 19.59375 C 12 22.955271 14.331391 25.855848 14.613281 26.228516 L 14.615234 26.228516 L 14.615234 26.230469 C 14.588494 26.195329 14.973031 26.752191 15.486328 27.419922 C 15.999626 28.087653 16.717405 28.96464 17.619141 29.914062 C 19.422612 31.812909 21.958282 34.007419 25.105469 35.349609 C 26.554789 35.966779 27.698179 36.339417 28.564453 36.611328 C 30.169845 37.115426 31.632073 37.038799 32.730469 36.876953 C 33.55263 36.755876 34.456878 36.361114 35.351562 35.794922 C 36.246248 35.22873 37.12309 34.524722 37.509766 33.455078 C 37.786772 32.688244 37.927591 31.979598 37.978516 31.396484 C 38.003976 31.104927 38.007211 30.847602 37.988281 30.609375 C 37.969311 30.371148 37.989581 30.188664 37.767578 29.824219 C 37.302009 29.059804 36.774753 29.039853 36.224609 28.767578 C 35.918939 28.616297 35.048661 28.191329 34.175781 27.775391 C 33.303883 27.35992 32.54892 26.991953 32.083984 26.826172 C 31.790239 26.720488 31.431556 26.568352 30.914062 26.626953 C 30.396569 26.685553 29.88546 27.058933 29.587891 27.5 C 29.305837 27.918069 28.170387 29.258349 27.824219 29.652344 C 27.819619 29.649544 27.849659 29.663383 27.712891 29.595703 C 27.284761 29.383815 26.761157 29.203652 25.986328 28.794922 C 25.2115 28.386192 24.242255 27.782635 23.181641 26.847656 L 23.181641 26.845703 C 21.603029 25.455949 20.497272 23.711106 20.148438 23.125 C 20.171937 23.09704 20.145643 23.130901 20.195312 23.082031 L 20.197266 23.080078 C 20.553781 22.728924 20.869739 22.309521 21.136719 22.001953 C 21.515257 21.565866 21.68231 21.181437 21.863281 20.822266 C 22.223954 20.10644 22.02313 19.318742 21.814453 18.904297 L 21.814453 18.902344 C 21.828863 18.931014 21.701572 18.650157 21.564453 18.326172 C 21.426943 18.001263 21.251663 17.580039 21.064453 17.130859 C 20.690033 16.232501 20.272027 15.224912 20.023438 14.634766 L 20.023438 14.632812 C 19.730591 13.937684 19.334395 13.436908 18.816406 13.195312 C 18.298417 12.953717 17.840778 13.022402 17.822266 13.021484 L 17.820312 13.021484 C 17.450668 13.004432 17.045038 13 16.642578 13 z M 16.642578 15 C 17.028118 15 17.408214 15.004701 17.726562 15.019531 C 18.054056 15.035851 18.033687 15.037192 17.970703 15.007812 C 17.906713 14.977972 17.993533 14.968282 18.179688 15.410156 C 18.423098 15.98801 18.84317 16.999249 19.21875 17.900391 C 19.40654 18.350961 19.582292 18.773816 19.722656 19.105469 C 19.863021 19.437122 19.939077 19.622295 20.027344 19.798828 L 20.027344 19.800781 L 20.029297 19.802734 C 20.115837 19.973483 20.108185 19.864164 20.078125 19.923828 C 19.867096 20.342656 19.838461 20.445493 19.625 20.691406 C 19.29998 21.065838 18.968453 21.483404 18.792969 21.65625 C 18.639439 21.80707 18.36242 22.042032 18.189453 22.501953 C 18.016221 22.962578 18.097073 23.59457 18.375 24.066406 C 18.745032 24.6946 19.964406 26.679307 21.859375 28.347656 C 23.05276 29.399678 24.164563 30.095933 25.052734 30.564453 C 25.940906 31.032973 26.664301 31.306607 26.826172 31.386719 C 27.210549 31.576953 27.630655 31.72467 28.119141 31.666016 C 28.607627 31.607366 29.02878 31.310979 29.296875 31.007812 L 29.298828 31.005859 C 29.655629 30.601347 30.715848 29.390728 31.224609 28.644531 C 31.246169 28.652131 31.239109 28.646231 31.408203 28.707031 L 31.408203 28.708984 L 31.410156 28.708984 C 31.487356 28.736474 32.454286 29.169267 33.316406 29.580078 C 34.178526 29.990889 35.053561 30.417875 35.337891 30.558594 C 35.748225 30.761674 35.942113 30.893881 35.992188 30.894531 C 35.995572 30.982516 35.998992 31.07786 35.986328 31.222656 C 35.951258 31.624292 35.8439 32.180225 35.628906 32.775391 C 35.523582 33.066746 34.975018 33.667661 34.283203 34.105469 C 33.591388 34.543277 32.749338 34.852514 32.4375 34.898438 C 31.499896 35.036591 30.386672 35.087027 29.164062 34.703125 C 28.316336 34.437036 27.259305 34.092596 25.890625 33.509766 C 23.114812 32.325956 20.755591 30.311513 19.070312 28.537109 C 18.227674 27.649908 17.552562 26.824019 17.072266 26.199219 C 16.592866 25.575584 16.383528 25.251054 16.208984 25.021484 L 16.207031 25.019531 C 15.897202 24.609805 14 21.970851 14 19.59375 C 14 17.077989 15.168497 16.091436 15.800781 15.410156 C 16.132721 15.052495 16.495617 15 16.642578 15 z"></path>
                </svg>
            </a>
            <a className='FooterIcons' href='https://github.com/Gasvn7' target='_blank' rel="noopener noreferrer">
                <p>GitHub</p>
                <svg xmlns="http://www.w3.org/2000/svg" x="0px" y="0px" width="100" height="100" viewBox="0 0 50 50">
                    <path d="M17.791,46.836C18.502,46.53,19,45.823,19,45v-5.4c0-0.197,0.016-0.402,0.041-0.61C19.027,38.994,19.014,38.997,19,39 c0,0-3,0-3.6,0c-1.5,0-2.8-0.6-3.4-1.8c-0.7-1.3-1-3.5-2.8-4.7C8.9,32.3,9.1,32,9.7,32c0.6,0.1,1.9,0.9,2.7,2c0.9,1.1,1.8,2,3.4,2 c2.487,0,3.82-0.125,4.622-0.555C21.356,34.056,22.649,33,24,33v-0.025c-5.668-0.182-9.289-2.066-10.975-4.975 c-3.665,0.042-6.856,0.405-8.677,0.707c-0.058-0.327-0.108-0.656-0.151-0.987c1.797-0.296,4.843-0.647,8.345-0.714 c-0.112-0.276-0.209-0.559-0.291-0.849c-3.511-0.178-6.541-0.039-8.187,0.097c-0.02-0.332-0.047-0.663-0.051-0.999 c1.649-0.135,4.597-0.27,8.018-0.111c-0.079-0.5-0.13-1.011-0.13-1.543c0-1.7,0.6-3.5,1.7-5c-0.5-1.7-1.2-5.3,0.2-6.6 c2.7,0,4.6,1.3,5.5,2.1C21,13.4,22.9,13,25,13s4,0.4,5.6,1.1c0.9-0.8,2.8-2.1,5.5-2.1c1.5,1.4,0.7,5,0.2,6.6c1.1,1.5,1.7,3.2,1.6,5 c0,0.484-0.045,0.951-0.11,1.409c3.499-0.172,6.527-0.034,8.204,0.102c-0.002,0.337-0.033,0.666-0.051,0.999 c-1.671-0.138-4.775-0.28-8.359-0.089c-0.089,0.336-0.197,0.663-0.325,0.98c3.546,0.046,6.665,0.389,8.548,0.689 c-0.043,0.332-0.093,0.661-0.151,0.987c-1.912-0.306-5.171-0.664-8.879-0.682C35.112,30.873,31.557,32.75,26,32.969V33 c2.6,0,5,3.9,5,6.6V45c0,0.823,0.498,1.53,1.209,1.836C41.37,43.804,48,35.164,48,25C48,12.318,37.683,2,25,2S2,12.318,2,25 C2,35.164,8.63,43.804,17.791,46.836z"></path>
                </svg>
            </a>
        </div>
      </footer>
    </div>
  );
};

export default Recording;
