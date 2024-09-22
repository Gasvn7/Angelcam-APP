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
    </div>
  );
};

export default Recording;
