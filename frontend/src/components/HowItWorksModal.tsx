import { Modal } from 'antd';
import './HowItWorksModal.css';

interface HowItWorksModalProps {
  visible: boolean;
  onClose: () => void;
}

const HowItWorksModal = ({ visible, onClose }: HowItWorksModalProps) => {
  return (
    <Modal
      title='How It Works'
      open={visible}
      onCancel={onClose}
      footer={null}
      width={520}
      centered
      destroyOnHidden={true}
      maskClosable={true}
      transitionName=''
    >
      <div className='how-it-works-content'>
        <ol className='steps-list'>
          <li>
            <strong>Enter any public Letterboxd username</strong>
            <p>We'll randomly select 5 movies from their watchlist</p>
          </li>
          <li>
            <strong>
              Use Advanced Options to filter by genre or decade (optional)
            </strong>
            <p>Narrow down your selection to specific types of movies</p>
          </li>
          <li>
            <strong>Click "Drop Ball!" to start the Plinko game</strong>
            <p>Watch as physics randomly picks one of the 5 movies</p>
          </li>
          <li>
            <strong>Want different options?</strong>
            <p>
              Click the Shuffle button to shuffle the order of the 5 movies, or
              search the same username again for a fresh set
            </p>
          </li>
        </ol>

        <div className='note'>
          <strong>Note:</strong> Only works with public Letterboxd watchlists.
          First search takes a few seconds, but we cache results for faster
          subsequent searches!
        </div>
      </div>
    </Modal>
  );
};

export default HowItWorksModal;
