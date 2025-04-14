import React, { useState } from 'react';
import { TableCell, Tooltip, tooltipClasses, Typography, Fade, Box } from '@mui/material';
import { styled } from '@mui/material/styles';

const TableCellTooltip = ({ text, maxLength = 30 }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1000);
    } catch (err) {
      console.error('Copy failed:', err);
    }
  };

  const truncated = text.length > maxLength ? text.slice(0, maxLength) + '…' : text;

const LightTooltip = styled(({ className, ...props }) => (
  <Tooltip {...props} classes={{ popper: className }} />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    opacity: 1,
    fontSize: 16,
  },
}));

  return (
    <LightTooltip title={text} arrow 
       slots={{
          transition: Fade,
        }}
        slotProps={{
          transition: { timeout: 100 },
        }}>
      <TableCell
        onClick={handleCopy}
        sx={{
          cursor: 'pointer',
          position: 'relative',
          userSelect: 'none',
        }}
      >
        <Typography noWrap>{truncated}</Typography>

        {/* Centered Copied message */}
        <Fade in={copied}>
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              backgroundColor: 'gray',
              px: 1.5,
              py: 0.5,
              borderRadius: 1,
              boxShadow: 2,
              zIndex: 1,
              pointerEvents: 'none',
            }}
          >
            <Typography
              variant="caption"
              sx={{ fontWeight: 600 }}
            >
              Copied!
            </Typography>
          </Box>
        </Fade>
      </TableCell>
    </LightTooltip>
  );
};

export default TableCellTooltip;
